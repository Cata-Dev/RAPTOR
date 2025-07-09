import initDB from "./utils/mongoose";

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "core-js/features/reflect";

import { DocumentType } from "@typegoose/typegoose";
import { FilterQuery } from "mongoose";
import { inspect } from "util";
import NonScheduledRoutesModelInit, { dbFootPaths } from "./models/NonScheduledRoutes.model";
import ResultModelInit from "./models/result.model";
import TBMSchedulesModelInit from "./models/TBM_schedules.model";
import stopsModelInit, { dbTBM_Stops } from "./models/TBM_stops.model";
import TBMScheduledRoutesModelInit, { dbTBM_ScheduledRoutes } from "./models/TBMScheduledRoutes.model";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { bufferTime, MAX_SAFE_TIMESTAMP, McRAPTOR, McSharedRAPTOR, RAPTORData, RAPTORRunSettings, SharedID, SharedRAPTORData, Stop } from "../";
import { Journey, JourneyStepBase, JourneyStepFoot, JourneyStepType, JourneyStepVehicle, LocationType } from "./models/result.model";
import { binarySearch, mapAsync, unpackRefType, wait } from "./utils";
import { benchmark } from "./utils/benchmark";

// In meters
const FP_REQ_MAX_LEN = 3_000;
const FP_RUN_MAX_LEN = 2_000;

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

    const dbScheduledRoutes = (await TBMScheduledRoutesModel.find<DocumentType<DocumentType<ScheduledRoute>>>({}, dbScheduledRoutesProjection)
      .populate("trips.schedules")
      .lean()
      .exec()) as ScheduledRoute[];

    const dbStopProjection = { _id: 1 } as const;
    type Stop = Pick<dbTBM_Stops, keyof typeof dbStopProjection>;

    const stops = dbScheduledRoutes.reduce<{ id: ScheduledRoute["stops"][number]; connectedRoutes: ScheduledRoute["_id"][] }[]>(
      (acc, { _id, stops }) => {
        for (const stop of stops) {
          let pos = binarySearch(acc, stop, (a, b) => a - b.id);
          if (pos < 0) {
            pos = -pos - 1;
            acc.splice(pos, 0, { id: stop, connectedRoutes: [] });
          }
          acc[pos].connectedRoutes.push(_id);
        }

        return acc;
      },
      (
        (await stopsModel
          .find<DocumentType<DocumentType<Stop>>>(
            {
              $and: [{ coords: { $not: { $elemMatch: { $eq: Infinity } } } }],
            },
            dbStopProjection,
          )
          .sort({ _id: 1 })
          .lean()
          .exec()) as Stop[]
      ).map(({ _id: id }) => ({ id, connectedRoutes: [] })),
    );

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
        (await NonScheduledRoutesModel.find<DocumentType<DocumentType<NonScheduledRoute>>>(
          { $and: [{ $or: [{ from: stopId }, { to: stopId }] }, additionalQuery] },
          dbNonScheduledRoutesProjection,
        )
          .lean()
          .exec()) as NonScheduledRoute[]
      ).map(({ from, to, distance }) => ({ distance, ...(to === stopId ? { to: from } : { to }) }));

    return { dbScheduledRoutes, stops, dbNonScheduledRoutes };
  }
  const b1 = await benchmark(queryData, []);
  console.log("b1 ended");
  if (!b1.lastReturn) throw new Error(`b1 return null`);
  const { dbScheduledRoutes, stops, dbNonScheduledRoutes } = b1.lastReturn;

  async function createRAPTOR() {
    const RAPTORDataInst = SharedRAPTORData.makeFromRawData(
      await mapAsync<(typeof stops)[number], Stop<number, number>>(stops, async ({ id, connectedRoutes }) => ({
        id,
        connectedRoutes,
        transfers: (await dbNonScheduledRoutes(id, { distance: { $lte: FP_REQ_MAX_LEN } })).map(({ to, distance }) => ({
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
                  ? ([schedule.hor_estime.getTime() || MAX_SAFE_TIMESTAMP, schedule.hor_estime.getTime() || MAX_SAFE_TIMESTAMP] satisfies [
                      unknown,
                      unknown,
                    ])
                  : ([Infinity, Infinity] satisfies [unknown, unknown]),
              ),
            })),
          ] satisfies [unknown, unknown, unknown],
      ),
    );
    RAPTORDataInst.secure = true;
    const RAPTORInstance = new McSharedRAPTOR<number, [[number, "bufferTime"]]>(RAPTORDataInst, [bufferTime]);

    return { RAPTORInstance, RAPTORDataInst };
  }
  const b2 = await benchmark(createRAPTOR, []);
  console.log("b2 ended");
  if (!b2.lastReturn) throw new Error(`b2 return null`);
  const { RAPTORInstance, RAPTORDataInst } = b2.lastReturn;

  return { RAPTORInstance, RAPTORDataInst, TBMSchedulesModel, resultModel, stops };
}

async function run({ RAPTORInstance, RAPTORDataInst, TBMSchedulesModel, resultModel, stops }: Awaited<ReturnType<typeof init>>) {
  const attachStops = new Map<number, Stop<number, number>>();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const psIdNumber = stops.at(-1)!.id + 1;

  const distances: Record<number, number> = {
    // Barrière d'Ornano
    974: 100,
  };

  attachStops.set(psIdNumber, {
    id: psIdNumber,
    connectedRoutes: [],
    transfers: Object.keys(distances).map((k) => {
      const sId = parseInt(k);

      return { to: sId, length: distances[sId] };
    }),
  });

  Object.keys(distances).forEach((k) => {
    const sId = parseInt(k);

    attachStops.set(sId, {
      id: sId,
      connectedRoutes: [],
      transfers: [{ to: psIdNumber, length: distances[sId] }],
    });
  });

  const psId = SharedRAPTORData.serializeId(psIdNumber);

  RAPTORDataInst.attachData(Array.from(attachStops.values()), []);

  const args = process.argv.slice(2);
  let ps: number | SharedID;
  try {
    ps = JSON.parse(args[0]) as number;
  } catch (_) {
    ps = psId;
  }
  let pt: number;
  try {
    pt = JSON.parse(args[1]) as number;
  } catch (_) {
    pt =
      // Béthanie
      3846;
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

  const settings: RAPTORRunSettings = { walkSpeed: 1.5, maxTransferLength: FP_RUN_MAX_LEN };

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
      from: { type: LocationType.Address, id: 174287 },
      to: { type: LocationType.TBM, id: pt },
      departureTime: new Date(departureTime),
      journeys: results
        .flat()
        // Sort by arrival time
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .sort((a, b) => a.at(-1)!.label.time - b.at(-1)!.label.time)
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
