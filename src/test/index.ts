import initDB from "./utils/mongoose";

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "core-js/features/reflect";

import { DocumentType } from "@typegoose/typegoose";
import minimist from "minimist";
import { FilterQuery } from "mongoose";
import { exit } from "process";
import { inspect } from "util";
import {
  bufferTime,
  footDistance,
  InternalTimeInt,
  IRAPTORData,
  Journey,
  McRAPTOR,
  McSharedRAPTOR,
  measureJourney,
  RAPTOR,
  RAPTORData,
  RAPTORRunSettings,
  SharedID,
  SharedRAPTOR,
  SharedRAPTORData,
  sharedTimeIntOrderLow,
  sharedTimeScal,
  Stop,
  successProbaInt,
  Time,
  TimeIntOrderLow,
  TimeScal,
  Timestamp,
} from "../";
import BaseRAPTOR from "../base";
import NonScheduledRoutesModelInit, { dbFootPaths } from "./models/NonScheduledRoutes.model";
import ResultModelInit, {
  Journey as DBJourney,
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

function getArgsOptNumber(args: ReturnType<typeof minimist>, opt: string): number | null {
  if (opt in args) {
    if (typeof args[opt] === "number") return args[opt];

    console.warn(`Supplied "${opt}" was not of type number`, args[opt]);
  }

  return null;
}

type DataType = "scalar" | "interval";

async function computeRAPTORData(
  { stops, dbNonScheduledRoutes, dbScheduledRoutes }: Awaited<ReturnType<typeof queryData>>,
  fpReqLen: number,
  dataType: DataType,
  /** In ms, [neg, pos] */
  delay: [number, number] | null,
) {
  return [
    dataType === "scalar" ? TimeScal : TimeIntOrderLow,
    await mapAsync<(typeof stops)[number], ConstructorParameters<typeof RAPTORData<Timestamp | InternalTimeInt>>[1][number]>(
      stops,
      async ({ id, connectedRoutes }) => [
        id,
        connectedRoutes,
        (await dbNonScheduledRoutes(id, { distance: { $lte: fpReqLen } })).map(({ to, distance }) => ({
          to,
          length: distance,
        })),
      ],
    ),
    dbScheduledRoutes.map(
      ({ _id, stops, trips }) =>
        [
          _id,
          stops,
          trips.map(({ tripId, schedules }) => ({
            id: tripId,
            times: schedules
              .map<[(typeof schedules)[number], [number, number]]>((schedule) => [
                schedule,
                typeof schedule === "object" && "hor_estime" in schedule
                  ? [schedule.hor_estime.getTime() || TimeScal.MAX_SAFE, schedule.hor_estime.getTime() || TimeScal.MAX_SAFE]
                  : [TimeScal.MAX, TimeScal.MAX],
              ])
              // Transform to interval
              .map(([schedule, [arr, dep]]) => {
                if (dataType === "interval") {
                  if (delay)
                    return [[arr - delay[0], arr + delay[1]] satisfies InternalTimeInt, [dep - delay[0], dep + delay[1]] satisfies InternalTimeInt];
                  else {
                    if (typeof schedule !== "object")
                      return [
                        [arr, arr],
                        [dep, dep],
                      ] satisfies [InternalTimeInt, InternalTimeInt];

                    let theo = schedule.hor_theo.getTime() || TimeScal.MAX_SAFE;
                    let estime = schedule.hor_estime.getTime() || schedule.hor_app.getTime() || TimeScal.MAX_SAFE;

                    // Prevent upper bound to be MAX_SAFE
                    if (theo < TimeScal.MAX_SAFE && estime === TimeScal.MAX_SAFE) estime = theo;
                    if (estime < TimeScal.MAX_SAFE && theo === TimeScal.MAX_SAFE) theo = estime;

                    const int = theo < estime ? [theo, estime] : [estime, theo];
                    return [[int[0], int[1]] as const, [int[0], int[1]] as const] satisfies [unknown, unknown];
                  }
                } else return [arr, dep] satisfies [unknown, unknown];
              }),
          })),
        ] satisfies [unknown, unknown, unknown],
    ),
  ] as ConstructorParameters<typeof RAPTORData<Timestamp | InternalTimeInt>>;
}

function computeSharedRAPTORData([_, stops, routes]: Awaited<ReturnType<typeof computeRAPTORData>>, dataType: DataType) {
  return [dataType === "scalar" ? sharedTimeScal : sharedTimeIntOrderLow, stops, routes] as Parameters<
    typeof SharedRAPTORData.makeFromRawData<Timestamp | InternalTimeInt>
  >;
}

function createRAPTOR<TimeVal>(data: ConstructorParameters<typeof RAPTORData<TimeVal>>) {
  const RAPTORDataInst = new RAPTORData(...data);
  return [RAPTORDataInst, new RAPTOR(RAPTORDataInst)] as const;
}

function createSharedRAPTOR<TimeVal>(data: Parameters<typeof SharedRAPTORData.makeFromRawData<TimeVal>>) {
  const SharedRAPTORDataInst = SharedRAPTORData.makeFromRawData(...data);
  return [SharedRAPTORDataInst, new SharedRAPTOR(SharedRAPTORDataInst)] as const;
}

function createMcRAPTOR<TimeVal, V, CA extends [V, string][]>(
  data: ConstructorParameters<typeof RAPTORData<TimeVal>>,
  criteria: ConstructorParameters<typeof McRAPTOR<TimeVal, V, CA>>[1],
) {
  const RAPTORDataInst = new RAPTORData(...data);
  return [RAPTORDataInst, new McRAPTOR(RAPTORDataInst, criteria)] as const;
}

function createMcSharedRAPTOR<TimeVal, V, CA extends [V, string][]>(
  data: Parameters<typeof SharedRAPTORData.makeFromRawData<TimeVal>>,
  criteria: ConstructorParameters<typeof McRAPTOR<TimeVal, V, CA>>[1],
) {
  const SharedRAPTORDataInst = SharedRAPTORData.makeFromRawData(...data);
  return [SharedRAPTORDataInst, new McSharedRAPTOR(SharedRAPTORDataInst, criteria)] as const;
}

type InstanceType = "RAPTOR" | "SharedRAPTOR" | "McRAPTOR" | "McSharedRAPTOR";

function isTimeTypeInternalInt(timeType: unknown): timeType is Time<InternalTimeInt> {
  return timeType === TimeIntOrderLow;
}

function postTreatment<TimeVal extends Timestamp | InternalTimeInt, V, CA extends [V, string][]>(
  timeType: Time<TimeVal>,
  instanceType: InstanceType,
  results: ReturnType<BaseRAPTOR<TimeVal, SharedID, number, number, V, CA>["getBestJourneys"]>,
  pt: SharedID,
) {
  if (isTimeTypeInternalInt(timeType)) {
    if (instanceType === "McRAPTOR" || instanceType === "McSharedRAPTOR") {
      // Add success proba as post treatment
      results = results.map((journeys) =>
        journeys.map((journey) =>
          measureJourney(successProbaInt, timeType, journey as unknown as Journey<InternalTimeInt, SharedID, number, V, CA>, pt),
        ),
      ) as unknown as typeof results;
    }
  }

  return results;
}

type DBJourneyReal = Omit<DBJourney, "steps"> & {
  steps: (JourneyStepBase | JourneyStepFoot | JourneyStepVehicle)[];
};
function journeyDBFormatter<TimeVal extends Timestamp | InternalTimeInt, V, CA extends [V, string][]>(
  journey: NonNullable<ReturnType<BaseRAPTOR<TimeVal, SharedID, number, number, V, CA>["getBestJourneys"]>[number][number]>,
): DBJourneyReal {
  return {
    steps: journey.map<JourneyStepFoot | JourneyStepVehicle | JourneyStepBase>((js) => ({
      ...js,
      time: typeof js.label.time === "number" ? [js.label.time, js.label.time] : js.label.time,
      ...("transfer" in js
        ? { type: JourneyStepType.Foot }
        : "route" in js
          ? { route: js.route.id, type: JourneyStepType.Vehicle }
          : {
              type: JourneyStepType.Base,
            }),
    })),
    criteria: journey[0].label.criteria.map(({ name }) => ({
      name,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      value: journey.at(-1)!.label.value(name),
    })),
  };
}

async function insertResults<TimeVal extends Timestamp | InternalTimeInt, V, CA extends [V, string][]>(
  resultModel: Awaited<ReturnType<typeof queryData>>["resultModel"],
  timeType: Time<TimeVal>,
  from: LocationAddress | LocationTBM,
  to: LocationAddress | LocationTBM,
  departureTime: TimeVal,
  settings: RAPTORRunSettings,
  results: ReturnType<BaseRAPTOR<TimeVal, SharedID, number, number, V, CA>["getBestJourneys"]>,
) {
  if (!results.length) throw new Error("No journey found");

  const { _id } = await resultModel.create({
    from,
    to,
    departureTime: typeof departureTime !== "number" ? departureTime[0] : departureTime,
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
  console.debug(`Using args`, args);

  const fpReqLen = getArgsOptNumber(args, "fp-req-len") ?? 3_000;
  console.debug(`Foot paths query max len`, fpReqLen);
  const fpRunLen = getArgsOptNumber(args, "fp-run-len") ?? 2_000;
  console.debug(`Foot paths run max len`, fpRunLen);

  let dataType: DataType;
  if ("d" in args) {
    switch ((args.d as string).toLowerCase()) {
      case "scal":
        dataType = "scalar";
        break;

      case "int":
        dataType = "interval";
        break;

      default:
        throw new Error(`Unexpected data type "${args.d}"`);
    }
  } else dataType = "interval";
  console.debug("Using data type", dataType);

  // Delay

  const delayPos = getArgsOptNumber(args, "delay-pos");
  if (delayPos !== null && dataType === "scalar" && delayPos > 0)
    console.warn(`Ignoring positive delay of ${delayPos}s because data type is ${dataType}`);

  const delayNeg = getArgsOptNumber(args, "delay-neg");
  if (delayNeg !== null && dataType === "scalar" && delayNeg > 0)
    console.warn(`Ignoring negative delay of ${delayNeg}s because data type is ${dataType}`);

  /** [neg, pos] */
  let delay: [number, number] | null = null;
  if (delayNeg !== null || delayPos !== null) delay = [delayNeg ?? 0, delayPos ?? 0];

  if (dataType !== "scalar") console.debug(delay ? `Using delay of -${delay[0]}s, ${delay[1]}s` : `Using natural delay`);

  let instanceType: InstanceType;
  if ("i" in args) {
    switch ((args.i as string).toLowerCase()) {
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
        throw new Error(`Unexpected instance type "${args.i}"`);
    }
  } else instanceType = "McSharedRAPTOR";
  console.debug("Using instance type", instanceType);

  let sharedSecure = false;
  if ("shared-secure" in args) {
    if (instanceType !== "SharedRAPTOR" && instanceType !== "McSharedRAPTOR")
      console.warn("Ignoring shared secure because instance type isn't shared");
    else if (args["shared-secure"]) sharedSecure = true;
  }
  if (instanceType === "SharedRAPTOR" || instanceType === "McSharedRAPTOR") console.debug(`Shared secure`, sharedSecure);

  const createTimes = getArgsOptNumber(args, "createTimes") ?? 1;
  const runTimes = getArgsOptNumber(args, "runTimes") ?? 1;
  const getResTimes = getArgsOptNumber(args, "getResTimes") ?? 1;

  const criteria = [] as [] | [typeof footDistance] | [typeof bufferTime] | [typeof footDistance, typeof bufferTime];
  if ("fd" in args && args.fd === true) (criteria as [typeof footDistance]).push(footDistance);
  if ("bt" in args && args.bt === true) (criteria as [typeof bufferTime]).push(bufferTime);

  console.debug(
    "Using criteria",
    criteria.map((c) => c.name),
  );
  if (criteria.length && instanceType !== "McRAPTOR" && instanceType !== "McSharedRAPTOR")
    console.warn("Got some criteria but instance type is uni-criteria.");

  const saveResults = "save" in args && args.save === true ? true : false;
  console.debug(`Saving results`, saveResults);

  const b1 = await benchmark(queryData, []);
  const queriedData = b1.lastReturn;
  if (!queriedData) throw new Error("No queried data");

  // Setup source & destination
  let ps: number | SharedID;
  let from: LocationAddress | LocationTBM;

  const psOpt = getArgsOptNumber(args, "ps");
  if (psOpt === null) {
    ps = 974; // Barrière d'Ornano
    from = { type: LocationType.Address, id: 174287 };
  } else {
    ps = psOpt;
    from = { type: LocationType.TBM, id: ps };
  }
  let psInternalId = ps;

  const pt =
    getArgsOptNumber(args, "pt") ??
    // Béthanie
    3846;

  // Compute RAPTOR data

  const distances: Record<number, number> = {
    // Need the true ps
    [ps]: 100,
  };

  const b2 = await benchmark(computeRAPTORData, [queriedData, fpReqLen, dataType, delay]);
  const rawRAPTORData = b2.lastReturn;
  if (!rawRAPTORData) throw new Error("No raw RAPTOR data");

  let rawSharedRAPTORData: Awaited<ReturnType<typeof computeSharedRAPTORData>>;

  if (instanceType === "SharedRAPTOR" || instanceType === "McSharedRAPTOR") {
    // Shared-specific RAPTOR data computation

    const b3 = await benchmark(computeSharedRAPTORData, [rawRAPTORData, dataType]);
    if (!b3.lastReturn) throw new Error("No raw Shared RAPTOR data");
    rawSharedRAPTORData = b3.lastReturn;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    psInternalId = queriedData.stops.at(-1)!.id + 1;
    ps = SharedRAPTORData.serializeId(psInternalId);
  }

  // Create RAPTOR

  const b4 = await (instanceType === "RAPTOR"
    ? benchmark(createRAPTOR<Timestamp | InternalTimeInt>, [rawRAPTORData], undefined, createTimes)
    : instanceType === "SharedRAPTOR"
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        benchmark(createSharedRAPTOR<Timestamp | InternalTimeInt>, [rawSharedRAPTORData!], undefined, createTimes)
      : instanceType === "McRAPTOR"
        ? benchmark(
            createMcRAPTOR<
              Timestamp | InternalTimeInt,
              number,
              [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
            >,
            [
              rawRAPTORData,
              criteria as Parameters<
                typeof createMcRAPTOR<
                  Timestamp | InternalTimeInt,
                  number,
                  [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
                >
              >[1],
            ],
            undefined,
            createTimes,
          )
        : benchmark(
            createMcSharedRAPTOR<
              Timestamp | InternalTimeInt,
              number,
              [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
            >,
            [
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              rawSharedRAPTORData!,
              criteria as Parameters<
                typeof createMcSharedRAPTOR<
                  Timestamp | InternalTimeInt,
                  number,
                  [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
                >
              >[1],
            ],
            undefined,
            createTimes,
          ));
  if (!b4.lastReturn) throw new Error("No RAPTOR instance");
  const [RAPTORDataInst, RAPTORInstance] = b4.lastReturn as readonly [
    Omit<IRAPTORData<Timestamp | InternalTimeInt, SharedID, number, number>, "attachData"> & {
      attachStops: SharedRAPTORData<Timestamp | InternalTimeInt>["attachStops"];
    },
    BaseRAPTOR<
      Timestamp | InternalTimeInt,
      SharedID,
      number,
      number,
      number,
      [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
    >,
  ];

  if (sharedSecure) (RAPTORDataInst as SharedRAPTORData<Timestamp | InternalTimeInt>).secure = true;

  // Attach stops

  const attachStops = new Map<number, ConstructorParameters<typeof Stop<number, number>>>();

  attachStops.set(psInternalId, [
    psInternalId,
    [],
    Object.keys(distances).map((k) => {
      const sId = parseInt(k);

      return { to: sId, length: distances[sId] };
    }),
  ]);

  Object.keys(distances).forEach((k) => {
    const sId = parseInt(k);

    attachStops.set(sId, [sId, [], [{ to: psInternalId, length: distances[sId] }]]);
  });

  RAPTORDataInst.attachStops(Array.from(attachStops.values()));

  // Run params

  // https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/#-sort----limit-coalescence
  const maxUpdatedAt = (await queriedData.TBMSchedulesModel.find().sort({ updatedAt: -1 }).limit(1))[0]?.updatedAt?.getTime() ?? Infinity;

  const departureTime = dataType === "interval" ? ([maxUpdatedAt, maxUpdatedAt] satisfies [unknown, unknown]) : maxUpdatedAt;

  const settings: RAPTORRunSettings = { walkSpeed: 1.5, maxTransferLength: fpRunLen };

  // Run

  function runRAPTOR() {
    RAPTORInstance.run(ps, pt, departureTime, settings);
  }
  console.log(
    `Running with: ps=${ps}, pt=${pt}, departure time=${new Date(typeof departureTime === "number" ? departureTime : departureTime[0]).toLocaleString()}, settings=${JSON.stringify(settings)}`,
  );
  await benchmark(runRAPTOR, [], undefined, runTimes);

  // Get results

  function resultRAPTOR() {
    return RAPTORInstance.getBestJourneys(pt);
  }
  const b6 = await benchmark(resultRAPTOR, [], undefined, getResTimes);
  if (!b6.lastReturn) throw new Error(`No best journeys`);
  console.debug("Best journeys", inspect(b6.lastReturn, false, 6));

  const b7 = await benchmark(
    postTreatment<
      Timestamp | InternalTimeInt,
      number,
      [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
    >,
    [RAPTORDataInst.timeType, instanceType, b6.lastReturn, pt],
  );
  if (!b7.lastReturn) throw new Error(`No post treatment`);
  console.debug("Post treatment", inspect(b7.lastReturn, false, 6));

  if (saveResults) {
    // Save results

    const b8 = await benchmark(
      insertResults<
        Timestamp | InternalTimeInt,
        number,
        [] | [[number, "footDistance"]] | [[number, "bufferTime"]] | [[number, "footDistance"], [number, "bufferTime"]]
      >,
      [queriedData.resultModel, RAPTORDataInst.timeType, from, { type: LocationType.TBM, id: pt }, departureTime, settings, b6.lastReturn],
    );
    console.log("Saved result id", b8.lastReturn);
  }
})()
  .then(() => {
    console.log("Main ended");
    exit(0);
  })
  .catch(console.error);
