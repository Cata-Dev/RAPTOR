import initDB from "./utils/mongoose";

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "core-js/features/reflect";

import { DocumentType } from "@typegoose/typegoose";
import minimist from "minimist";
import { FilterQuery } from "mongoose";
import {
  bufferTime,
  footDistance,
  IRAPTORData,
  MAX_SAFE_TIMESTAMP,
  McRAPTOR,
  McSharedRAPTOR,
  Ordered,
  RAPTOR,
  RAPTORData,
  RAPTORRunSettings,
  SharedID,
  SharedRAPTOR,
  SharedRAPTORData,
  sharedTimeScal,
  Stop,
  Time,
  TimeScal,
} from "../";
import BaseRAPTOR from "../base";
import NonScheduledRoutesModelInit, { dbFootPaths } from "./models/NonScheduledRoutes.model";
import ResultModelInit, {
  Journey,
  JourneyStepBase,
  JourneyStepFoot,
  JourneyStepType,
  JourneyStepVehicle,
  LocationAddress,
  LocationTBM,
  LocationType,
} from "./models/result.model";
import TBMSchedulesModelInit from "./models/TBM_schedules.model";
import stopsModelInit, { dbTBM_Stops } from "./models/TBM_stops.model";
import TBMScheduledRoutesModelInit, { dbTBM_ScheduledRoutes } from "./models/TBMScheduledRoutes.model";
import { binarySearch, mapAsync, unpackRefType } from "./utils";
import { benchmark } from "./utils/benchmark";

// In meters
const FP_REQ_MAX_LEN = 3_000;
const FP_RUN_MAX_LEN = 2_000;

async function queryData() {
  console.debug("Querying data...");
  const sourceDB = await initDB("bibm");
  const computeDB = await initDB("bibm-compute");
  const stopsModel = stopsModelInit(sourceDB);
  const TBMSchedulesModel = TBMSchedulesModelInit(sourceDB)[1];
  const TBMScheduledRoutesModel = TBMScheduledRoutesModelInit(sourceDB);
  const NonScheduledRoutesModel = NonScheduledRoutesModelInit(sourceDB);

  const resultModel = ResultModelInit(computeDB);

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

  return { dbScheduledRoutes, stops, dbNonScheduledRoutes, TBMSchedulesModel, resultModel };
}

async function computeRAPTORData({ stops, dbNonScheduledRoutes, dbScheduledRoutes }: Awaited<ReturnType<typeof queryData>>) {
  return [
    TimeScal,
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
  ] satisfies ConstructorParameters<typeof RAPTORData<number>>;
}

function computeSharedRAPTORData([_, stops, routes]: Awaited<ReturnType<typeof computeRAPTORData>>) {
  return [sharedTimeScal, stops, routes] satisfies Parameters<typeof SharedRAPTORData.makeFromRawData<number>>;
}

function createRAPTOR<TimeVal>(data: ConstructorParameters<typeof RAPTORData<TimeVal>>) {
  const RAPTORDataInst = new RAPTORData(...data);
  return [RAPTORDataInst, new RAPTOR(RAPTORDataInst)] as const;
}

function createSharedRAPTOR<TimeVal>(data: Parameters<typeof SharedRAPTORData.makeFromRawData<TimeVal>>) {
  const SharedRAPTORDataInst = SharedRAPTORData.makeFromRawData(...data);
  SharedRAPTORDataInst.secure = true;
  return [SharedRAPTORDataInst, new SharedRAPTOR(SharedRAPTORDataInst)] as const;
}

function createMcRAPTOR<TimeVal, V extends Ordered<V>, CA extends [V, string][]>(
  data: ConstructorParameters<typeof RAPTORData<TimeVal>>,
  criteria: ConstructorParameters<typeof McRAPTOR<TimeVal, V, CA>>[1],
) {
  const RAPTORDataInst = new RAPTORData(...data);
  return [RAPTORDataInst, new McRAPTOR(RAPTORDataInst, criteria)] as const;
}

function createMcSharedRAPTOR<TimeVal, V extends Ordered<V>, CA extends [V, string][]>(
  data: Parameters<typeof SharedRAPTORData.makeFromRawData<TimeVal>>,
  criteria: ConstructorParameters<typeof McRAPTOR<TimeVal, V, CA>>[1],
) {
  const SharedRAPTORDataInst = SharedRAPTORData.makeFromRawData(...data);
  SharedRAPTORDataInst.secure = true;
  return [SharedRAPTORDataInst, new McSharedRAPTOR(SharedRAPTORDataInst, criteria)] as const;
}

type DBJourney = Omit<Journey, "steps"> & {
  steps: (JourneyStepBase | JourneyStepFoot | JourneyStepVehicle)[];
};
function journeyDBFormatter<TimeVal, V extends Ordered<V>, CA extends [V, string][]>(
  journey: NonNullable<ReturnType<BaseRAPTOR<TimeVal, SharedID, SharedID, number, V, CA>["getBestJourneys"]>[number][number]>,
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

async function insertResults<TimeVal, V extends Ordered<V>, CA extends [V, string][]>(
  resultModel: Awaited<ReturnType<typeof queryData>>["resultModel"],
  timeType: Time<TimeVal>,
  from: LocationAddress | LocationTBM,
  to: LocationAddress | LocationTBM,
  departureTime: TimeVal,
  settings: RAPTORRunSettings,
  results: ReturnType<BaseRAPTOR<TimeVal, SharedID, SharedID, number, V, CA>["getBestJourneys"]>,
) {
  if (!results.length) throw new Error("No journey found");

  const { _id } = await resultModel.create({
    from,
    to,
    departureTime,
    journeys: results
      .flat()
      // Sort by arrival time
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .sort((a, b) => timeType.order(a.at(-1)!.label.time, b.at(-1)!.label.time))
      .map((journey) => journeyDBFormatter(journey)),
    settings,
  });

  return _id;
}

// Main IIFE test function
(async () => {
  // Setup params from command line
  const args = minimist(process.argv);

  let instanceType: "RAPTOR" | "SharedRAPTOR" | "McRAPTOR" | "McSharedRAPTOR";
  if ("t" in args) {
    switch ((args.t as string).toLowerCase()) {
      case "r":
        instanceType = "RAPTOR";
        break;

      case "sr":
        instanceType = "SharedRAPTOR";
        break;

      case "mcr":
        instanceType = "McRAPTOR";
        break;

      case "mcsr":
        instanceType = "McSharedRAPTOR";
        break;

      default:
        throw new Error(`Unexpected instance type "${args.t}"`);
    }
  } else instanceType = "McSharedRAPTOR";

  const createTimes = "createTimes" in args ? (args.createTimes as number) : 1;
  const runTimes = "runTimes" in args ? (args.runTimes as number) : 1;
  const getResTimes = "getResTimes" in args ? (args.getResTimes as number) : 1;

  const criteria = [] as [] | [typeof footDistance] | [typeof bufferTime] | [typeof footDistance, typeof bufferTime];
  if ("fd" in args && args.fd === true) (criteria as [typeof footDistance]).push(footDistance);
  if ("bt" in args && args.bt === true) (criteria as [typeof bufferTime]).push(bufferTime);
  if (criteria.length && instanceType !== "McRAPTOR" && instanceType !== "McSharedRAPTOR")
    console.warn("Got some criteria but instance type is uni-criteria.");

  const b1 = await benchmark(queryData, []);
  const queriedData = b1.lastReturn;
  if (!queriedData) throw new Error("No queried data");

  // Setup source & destination
  let from: LocationAddress | LocationTBM;
  let ps: number | SharedID;

  if ("ps" in args) {
    ps = args.ps as number;
    from = { type: LocationType.TBM, id: ps };
  } else {
    ps = 974; // Barrière d'Ornano
    from = { type: LocationType.Address, id: 174287 };
  }
  let psInternalId = ps;

  const pt =
    "pt" in args
      ? (args.pt as number) // Béthanie
      : 3846;

  const b2 = await benchmark(computeRAPTORData, [queriedData]);
  const rawRAPTORData = b2.lastReturn;
  if (!rawRAPTORData) throw new Error("No raw RAPTOR data");

  const attachStops = new Map<number, Stop<number, number>>();
  const distances: Record<number, number> = {
    [ps]: 100,
  };

  let RAPTORDataInst: Omit<IRAPTORData<number, SharedID, SharedID, number>, "attachData"> & { attachData: SharedRAPTORData<number>["attachData"] };
  let RAPTORInstance: BaseRAPTOR<
    number,
    SharedID,
    SharedID,
    number,
    number,
    [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
  >;

  if (instanceType === "SharedRAPTOR" || instanceType === "McSharedRAPTOR") {
    const b3 = await benchmark(computeSharedRAPTORData, [rawRAPTORData]);
    const rawSharedRAPTORData = b3.lastReturn;
    if (!rawSharedRAPTORData) throw new Error("No raw Shared RAPTOR data");

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    psInternalId = queriedData.stops.at(-1)!.id + 1;
    ps = SharedRAPTORData.serializeId(psInternalId);

    const b4 = await (instanceType === "SharedRAPTOR"
      ? benchmark<typeof createSharedRAPTOR<number>>(createSharedRAPTOR, [rawSharedRAPTORData], undefined, createTimes)
      : benchmark(
          createMcSharedRAPTOR<
            number,
            number,
            [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
          >,
          [
            rawSharedRAPTORData,
            criteria as Parameters<
              typeof createMcSharedRAPTOR<
                number,
                number,
                [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
              >
            >[1],
          ],
          undefined,
          createTimes,
        ));
    if (!b4.lastReturn) throw new Error("No RAPTOR instance");
    [RAPTORDataInst, RAPTORInstance] = b4.lastReturn as readonly [typeof RAPTORDataInst, typeof RAPTORInstance];
  } else {
    const b4 = await (instanceType === "RAPTOR"
      ? benchmark<typeof createRAPTOR<number>>(createRAPTOR, [rawRAPTORData], undefined, createTimes)
      : benchmark(
          createMcRAPTOR<
            number,
            number,
            [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
          >,
          [
            rawRAPTORData,
            criteria as Parameters<
              typeof createMcRAPTOR<
                number,
                number,
                [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
              >
            >[1],
          ],
          undefined,
          createTimes,
        ));
    if (!b4.lastReturn) throw new Error("No RAPTOR instance");
    [RAPTORDataInst, RAPTORInstance] = b4.lastReturn as readonly [typeof RAPTORDataInst, typeof RAPTORInstance];
  }

  attachStops.set(psInternalId, {
    id: psInternalId,
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
      transfers: [{ to: psInternalId, length: distances[sId] }],
    });
  });

  RAPTORDataInst.attachData(Array.from(attachStops.values()), []);

  // https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/#-sort----limit-coalescence
  const minSchedule =
    (
      await queriedData.TBMSchedulesModel.find({ hor_estime: { $gt: new Date(0) } }, { hor_estime: 1 })
        .sort({ hor_estime: 1 })
        .limit(1)
    )[0]?.hor_estime?.getTime() ?? Infinity;
  const maxSchedule =
    (await queriedData.TBMSchedulesModel.find({}, { hor_estime: 1 }).sort({ hor_estime: -1 }).limit(1))[0]?.hor_estime?.getTime() ?? Infinity;

  const departureTime = (minSchedule + maxSchedule) / 2;

  const settings: RAPTORRunSettings = { walkSpeed: 1.5, maxTransferLength: FP_RUN_MAX_LEN };

  function runRAPTOR() {
    RAPTORInstance.run(ps, pt, departureTime, settings);
  }
  await benchmark(runRAPTOR, [], undefined, runTimes);

  function resultRAPTOR() {
    return RAPTORInstance.getBestJourneys(pt);
  }
  const b6 = await benchmark(resultRAPTOR, [], undefined, getResTimes);
  if (!b6.lastReturn) throw new Error(`No best journeys`);

  await benchmark(
    insertResults<number, number, [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]>,
    [queriedData.resultModel, RAPTORDataInst.timeType, from, { type: LocationType.TBM, id: pt }, departureTime, settings, b6.lastReturn],
  );
})()
  .then(() => {
    console.log("Main ended");
  })
  .catch(console.error);
