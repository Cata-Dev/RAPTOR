import initDB from "./utils/mongoose";

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "core-js/features/reflect";

import NonScheduledRoutesModelInit, { dbFootPaths } from "./models/NonScheduledRoutes.model";
import ResultModelInit from "./models/result.model";
import TBMSchedulesModelInit from "./models/TBM_schedules.model";
import stopsModelInit, { dbTBM_Stops } from "./models/TBM_stops.model";
import TBMScheduledRoutesModelInit, { dbTBM_ScheduledRoutes } from "./models/TBMScheduledRoutes.model";
import { DocumentType } from "@typegoose/typegoose";
import { FilterQuery, HydratedDocument } from "mongoose";
import { inspect } from "util";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { bufferTime, McRAPTOR, McSharedRAPTOR, RAPTORData, RAPTORRunSettings, SharedRAPTORData, Stop } from "../";
import { Journey, JourneyStepBase, JourneyStepFoot, JourneyStepType, JourneyStepVehicle, LocationType } from "./models/result.model";
import { mapAsync, unpackRefType, wait } from "./utils";
import { benchmark } from "./utils/benchmark";

// In meters
const FP_MAX_LEN = 1_000;

async function init() {
  const sourceDB = await initDB("bibm");
  const computeDB = await initDB("bibm-compute");
  const stopsModel = stopsModelInit(sourceDB);
  const TBMSchedulesModel = TBMSchedulesModelInit(sourceDB)[1];
  const TBMScheduledRoutesModel = TBMScheduledRoutesModelInit(sourceDB);
  const NonScheduledRoutesModel = NonScheduledRoutesModelInit(sourceDB);

  const resultModel = ResultModelInit(computeDB);

  async function queryData() {
    const dbScheduledRoutesProjection: Partial<Record<keyof dbTBM_ScheduledRoutes, 1>> = { _id: 1, stops: 1, trips: 1 };
    type dbScheduledRoute = Pick<dbTBM_ScheduledRoutes, keyof typeof dbScheduledRoutesProjection>;
    interface ScheduledRoutesOverwritten {
      stops: unpackRefType<dbScheduledRoute["stops"]>;
    }
    type ScheduledRoute = Omit<dbScheduledRoute, keyof ScheduledRoutesOverwritten> & ScheduledRoutesOverwritten;

    const dbScheduledRoutes = (await TBMScheduledRoutesModel.find<HydratedDocument<DocumentType<ScheduledRoute>>>({}, dbScheduledRoutesProjection)
      .populate("trips.schedules")
      .lean()
      .exec()) as ScheduledRoute[];

    const dbStopProjection = { _id: 1, coords: 1 } as const;
    type Stop = Pick<dbTBM_Stops, keyof typeof dbStopProjection>;

    const dbStops = (await stopsModel
      .find<HydratedDocument<DocumentType<Stop>>>(
        {
          $and: [{ coords: { $not: { $elemMatch: { $eq: Infinity } } } }],
        },
        dbStopProjection,
      )
      .lean()
      // Coords field type lost...
      .exec()) as unknown as Stop[];

    const dbNonScheduledRoutesProjection: Partial<Record<keyof dbFootPaths, 1>> = { from: 1, to: 1, distance: 1 };
    type dbNonScheduledRoute = Pick<dbFootPaths, keyof typeof dbNonScheduledRoutesProjection>;
    interface NonScheduledRoutesOverwritten {
      from: unpackRefType<dbNonScheduledRoute["from"]>;
      to: unpackRefType<dbNonScheduledRoute["to"]>;
    }
    type NonScheduledRoute = Omit<dbNonScheduledRoute, keyof NonScheduledRoutesOverwritten> & NonScheduledRoutesOverwritten;

    //Query must associate (s, from) AND (from, s) forall s in stops !
    const dbNonScheduledRoutes = async (stopId: NonScheduledRoutesOverwritten["from"], additionalQuery: FilterQuery<dbNonScheduledRoute> = {}) =>
      (
        (await NonScheduledRoutesModel.find<HydratedDocument<DocumentType<NonScheduledRoute>>>(
          { $and: [{ $or: [{ from: stopId }, { to: stopId }] }, additionalQuery] },
          dbNonScheduledRoutesProjection,
        )
          .lean()
          .exec()) as NonScheduledRoute[]
      ).map(({ from, to, distance }) => ({ distance, ...(to === stopId ? { to: from } : { to }) }));

    return { dbScheduledRoutes, dbStops, dbNonScheduledRoutes };
  }
  const b1 = await benchmark(queryData, []);
  console.log("b1 ended");
  if (!b1.lastReturn) throw new Error(`b1 return null`);
  const { dbScheduledRoutes, dbStops, dbNonScheduledRoutes } = b1.lastReturn;

  async function createRAPTOR() {
    const RAPTORDataInst = new RAPTORData(
      await mapAsync<(typeof dbStops)[number], Stop<number, number>>(dbStops, async ({ _id, coords }) => ({
        id: _id,
        lat: coords[0],
        long: coords[1],
        connectedRoutes: dbScheduledRoutes.filter((ScheduledRoute) => ScheduledRoute.stops.find((stopId) => stopId === _id)).map(({ _id }) => _id),
        transfers: (await dbNonScheduledRoutes(_id, { distance: { $lte: FP_MAX_LEN } })).map(({ to, distance }) => ({
          to,
          length: distance,
        })),
      })),
      dbScheduledRoutes.map(
        ({ _id, stops, trips }) =>
          [
            _id,
            stops,
            trips.map(({ tripId, schedules }) => ({
              id: tripId,
              times: schedules.map((schedule) =>
                typeof schedule === "object" && "hor_estime" in schedule
                  ? ([
                      schedule.hor_estime.getTime() || RAPTORData.MAX_SAFE_TIMESTAMP,
                      schedule.hor_estime.getTime() || RAPTORData.MAX_SAFE_TIMESTAMP,
                    ] satisfies [unknown, unknown])
                  : ([Infinity, Infinity] satisfies [unknown, unknown]),
              ),
            })),
          ] satisfies [unknown, unknown, unknown],
      ),
    );
    // RAPTORDataInst.secure = true;
    const RAPTORInstance = new McRAPTOR<["bufferTime"], number, number, number>(RAPTORDataInst, [bufferTime]);

    return { RAPTORInstance };
  }
  const b2 = await benchmark(createRAPTOR, []);
  console.log("b2 ended");
  if (!b2.lastReturn) throw new Error(`b2 return null`);
  const { RAPTORInstance } = b2.lastReturn;

  return { RAPTORInstance, TBMSchedulesModel, resultModel };
}

async function run({ RAPTORInstance, TBMSchedulesModel, resultModel }: Awaited<ReturnType<typeof init>>) {
  const args = process.argv.slice(2);
  let ps: number;
  try {
    ps = JSON.parse(args[0]) as number;
  } catch (_) {
    ps = 2832;
  }
  let pt: number;
  try {
    pt = JSON.parse(args[1]) as number;
  } catch (_) {
    pt = 169;
  }

  // https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/#-sort----limit-coalescence
  const minSchedule =
    (
      await TBMSchedulesModel.find({ hor_estime: { $gt: new Date(0) } }, { hor_estime: 1 })
        .sort({ hor_estime: 1 })
        .limit(1)
    )[0]?.hor_estime?.getTime() ?? Infinity;
  const maxSchedule = (await TBMSchedulesModel.find({}, { hor_estime: 1 }).sort({ hor_estime: -1 }).limit(1))[0]?.hor_estime?.getTime() ?? Infinity;

  const departureTime = (minSchedule + maxSchedule) / 2;

  const settings: RAPTORRunSettings = { walkSpeed: 1.5 };

  function runRAPTOR() {
    RAPTORInstance.run(ps, pt, departureTime, settings);

    return true as const;
  }
  const b3 = await benchmark(runRAPTOR, []);
  console.log("b3 ended");
  if (!b3.lastReturn) throw new Error(`b3 return null`);

  function resultRAPTOR() {
    return RAPTORInstance.getBestJourneys(pt);
  }
  const b4 = await benchmark(resultRAPTOR, []);
  console.log("b4 ended");

  if (!b4.lastReturn) throw new Error(`b4 return null`);

  async function insertResults(results: ReturnType<typeof resultRAPTOR>) {
    type DBJourney = Omit<Journey, "steps"> & {
      steps: (JourneyStepBase | JourneyStepFoot | JourneyStepVehicle)[];
    };
    function journeyDBFormatter(
      journey: NonNullable<ReturnType<Awaited<ReturnType<typeof init>>["RAPTORInstance"]["getBestJourneys"]>[number]>[number],
    ): DBJourney {
      return {
        steps: journey.map((js) => {
          if ("transfer" in js) {
            return {
              ...js,
              time: js.label.time,
              type: JourneyStepType.Foot,
            } satisfies JourneyStepFoot;
          }

          if ("route" in js) {
            if (typeof js.route.id === "string") throw new Error("Invalid route to retrieve.");

            return {
              ...js,
              time: js.label.time,
              route: js.route.id,
              type: JourneyStepType.Vehicle,
            } satisfies JourneyStepVehicle;
          }

          return {
            ...js,
            time: js.label.time,
            type: JourneyStepType.Base,
          } satisfies JourneyStepBase;
        }),
        criteria: journey[0].label.criteria.map(({ name }) => ({
          name,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value: journey.at(-1)!.label.value(name),
        })),
      };
    }

    if (!results.length) throw new Error("No journey found");

    const { _id } = await resultModel.create({
      from: { type: LocationType.TBM, id: ps },
      to: { type: LocationType.TBM, id: pt },
      departureTime: new Date(departureTime),
      journeys: results
        .flat()
        .filter((journey) => !!journey)
        .map((journey) => journeyDBFormatter(journey)),
      settings,
    });

    return _id;
  }

  const b5 = await benchmark(insertResults, [b4.lastReturn]);
  console.log("inserted", b5.lastReturn);

  return b4.lastReturn;
}

// Main IIFE test function
(async () => {
  const initr = await init();

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const r = await run(initr);
    console.log(inspect(r, false, 3));
    await wait(10_000);
  }
})()
  .then(() => true)
  .catch(console.error);
