import initDB from "./utils/mongoose";

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "core-js/features/reflect";

import { Override, UnpackRefType } from "@bibm/common/types";
import { journeyDBFormatter } from "@bibm/compute/jobs/compute";
import { makeMapId, Providers } from "@bibm/compute/jobs/preCompute/utils";
import NonScheduledRoutesModelInit, { dbFootPaths } from "@bibm/data/models/Compute/NonScheduledRoutes.model";
import ResultModelInit, { LocationAddress, LocationTBM, PointType } from "@bibm/data/models/Compute/result.model";
import { Schedule } from "@bibm/data/models/Compute/types";
import SNCFScheduledRoutesModelInit, { dbSNCF_ScheduledRoutes } from "@bibm/data/models/SNCF/SNCFScheduledRoutes.model";
import { dbSNCF_Schedules } from "@bibm/data/models/SNCF/SNCF_schedules.model";
import SNCFStopsModelInit, { dbSNCF_Stops } from "@bibm/data/models/SNCF/SNCF_stops.model";
// Those 2 are local because of conflicting Mongoose instances between BIBM and here
// Otherwise, we get NotValidModelError [TypeError]: Expected "getDiscriminatorModelForClass.from" to be a valid mongoose.Model! (got: "function model(doc, fields, skipId) ...") [E205]
import TBMScheduledRoutesModelInit, { dbTBM_ScheduledRoutes } from "./models/TBMScheduledRoutes.model";
import TBMSchedulesModelInit, { dbTBM_Schedules_rt } from "./models/TBM_schedules.model";
import TBMStopsModelInit, { dbTBM_Stops } from "@bibm/data/models/TBM/TBM_stops.model";
import { DocumentType } from "@typegoose/typegoose";
import minimist from "minimist";
import { exit } from "process";
import { inspect } from "util";
import {
  bufferTime,
  convertBackJourneyStep,
  convertJourneyStep,
  Criterion,
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
  TimeInt,
  TimeScal,
  Timestamp,
  Trip,
} from "../";
import BaseRAPTOR from "../base";
import { Combinations } from "./utils";
import { benchmark } from "./utils/benchmark";

async function queryData(fpReqLen: number) {
  console.debug("Querying data...");
  const sourceDB = await initDB("bibm");
  const computeDB = await initDB("bibm-compute");
  const TBMStopsModel = TBMStopsModelInit(sourceDB);
  const SNCFStopsModel = SNCFStopsModelInit(sourceDB);
  const TBMSchedulesModel = TBMSchedulesModelInit(sourceDB)[1];
  const TBMScheduledRoutesModel = TBMScheduledRoutesModelInit(sourceDB);
  const SNCFScheduledRoutesModel = SNCFScheduledRoutesModelInit(sourceDB);
  const NonScheduledRoutesModel = NonScheduledRoutesModelInit(sourceDB);

  const resultModel = ResultModelInit(computeDB);

  /** DB Types */

  // Stops
  // TBM
  const dbTBMStopProjection = { _id: 1 } satisfies Partial<Record<keyof dbTBM_Stops, 1>>;
  type TBMStop = Pick<dbTBM_Stops, keyof typeof dbTBMStopProjection>;

  // SNCF
  const dbSNCFStopProjection = { _id: 1 } satisfies Partial<Record<keyof dbSNCF_Stops, 1>>;
  type SNCFStop = Pick<dbSNCF_Stops, keyof typeof dbSNCFStopProjection>;

  // Schedules
  const schedulesProjection = { arr_int_hor: 1, dep_int_hor: 1 } satisfies Partial<Record<keyof Schedule, 1>>;
  type dbSchedule = Pick<Schedule, keyof typeof schedulesProjection>;

  // Scheduled Routes
  // TBM
  const dbTBMSchedulesProjection = { hor_theo: 1 } satisfies Partial<Record<keyof dbTBM_Schedules_rt, 1>>;
  const dbTBMScheduledRoutesProjection = { _id: 1, stops: 1, trips: 1 } satisfies Partial<Record<keyof dbTBM_ScheduledRoutes, 1>>;
  type dbTBMScheduledRoute = Pick<dbTBM_ScheduledRoutes, keyof typeof dbTBMScheduledRoutesProjection>;
  interface TBMScheduledRoutesOverwritten /* extends dbTBM_ScheduledRoutes */ {
    _id: UnpackRefType<dbTBMScheduledRoute["_id"]>;
    stops: UnpackRefType<dbTBMScheduledRoute["stops"]>;
    trips: {
      // Not a Document because of lean
      schedules: (Pick<dbTBM_Schedules_rt, keyof typeof dbTBMSchedulesProjection> & dbSchedule)[];
    }[];
  }
  type TBMScheduledRoute = Override<dbTBMScheduledRoute, TBMScheduledRoutesOverwritten>;

  // SNCF
  const dbSNCFSchedulesProjection = { baseArrival: 1, baseDeparture: 1 } satisfies Partial<Record<keyof dbSNCF_Schedules, 1>>;
  const dbSNCFScheduledRoutesProjection = { _id: 1, stops: 1, trips: 1 } satisfies Partial<Record<keyof dbSNCF_ScheduledRoutes, 1>>;
  type dbSNCFScheduledRoute = Pick<dbSNCF_ScheduledRoutes, keyof typeof dbSNCFScheduledRoutesProjection>;
  interface SNCFScheduledRoutesOverwritten /* extends dbSNCF_ScheduledRoutes */ {
    stops: UnpackRefType<dbSNCFScheduledRoute["stops"]>;
    trips: {
      // Not a Document because of lean
      schedules: (Pick<dbSNCF_Schedules, keyof typeof dbSNCFSchedulesProjection> & dbSchedule)[];
    }[];
  }
  type SNCFScheduledRoute = Omit<dbSNCFScheduledRoute, keyof SNCFScheduledRoutesOverwritten> & SNCFScheduledRoutesOverwritten;

  type ProviderRouteId = TBMScheduledRoute["_id"] | SNCFScheduledRoute["_id"];
  // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
  type ProviderStopId = TBMStop["_id"] | SNCFStop["_id"];

  // Non Schedules Routes
  const dbNonScheduledRoutesProjection = { from: 1, to: 1, distance: 1 } satisfies Partial<Record<keyof dbFootPaths, 1>>;
  type dbNonScheduledRoute = Pick<dbFootPaths, keyof typeof dbNonScheduledRoutesProjection>;

  // Virtual IDs (stops routes) management

  const stopIdsMappingF = new Map<`${Providers}-${ProviderStopId}`, number>();
  const stopIdsMappingB = new Map<number, [ProviderStopId, Providers]>();
  const TBMStopsCount = (await TBMStopsModel.estimatedDocumentCount()) * 1.5;
  const SNCFStopsCount = (await SNCFStopsModel.estimatedDocumentCount()) * 1.5;
  const stopIdsRanges = {
    [Providers.TBM]: [0, TBMStopsCount, -1],
    [Providers.SNCF]: [TBMStopsCount + 1, TBMStopsCount + 1 + SNCFStopsCount, -1],
  } satisfies Record<string, [number, number, number]>;
  const [mapStopId, unmapStopId] = makeMapId(stopIdsRanges, stopIdsMappingF, stopIdsMappingB);

  const routeIdsMappingF = new Map<`${Providers}-${ProviderRouteId}`, number>();
  const routeIdsMappingB = new Map<number, [ProviderRouteId, Providers]>();
  // Memoizing allows us to only remember backward mapping, forward mapping is stored inside memoize
  const TBMSRCount = (await TBMScheduledRoutesModel.estimatedDocumentCount()) * 1.5;
  const SNCFSRCount = (await SNCFScheduledRoutesModel.estimatedDocumentCount()) * 1.5;
  const routeIdsRanges = {
    [Providers.TBM]: [0, TBMSRCount, -1],
    [Providers.SNCF]: [TBMSRCount + 1, TBMSRCount + 1 + SNCFSRCount, -1],
  } satisfies Record<string, [number, number, number]>;
  const [mapRouteId, unmapRouteId] = makeMapId(routeIdsRanges, routeIdsMappingF, routeIdsMappingB);

  // Non scheduled routes

  // Query must associate (s, from) AND (from, s) forall s in stops !
  const dbNonScheduledRoutes = (
    (await NonScheduledRoutesModel.find<DocumentType<dbNonScheduledRoute>>(
      { distance: { $lte: fpReqLen } },
      { ...dbNonScheduledRoutesProjection, _id: 0 },
    )
      .lean()
      .exec()) as dbNonScheduledRoute[]
  ).reduce<Map<number, ConstructorParameters<typeof RAPTORData<unknown, number, number>>[1][number][2]>>((acc, { from, to, distance }) => {
    const mappedFrom = mapStopId(parseInt(from.substring(3).split("-")[0]), parseInt(from.split("-")[1]));
    const mappedTo = mapStopId(parseInt(to.substring(3).split("-")[0]), parseInt(to.split("-")[1]));

    for (const [from, to] of [
      [mappedFrom, mappedTo],
      [mappedTo, mappedFrom],
    ]) {
      let stopNonScheduledRoutes = acc.get(from);
      if (!stopNonScheduledRoutes) {
        stopNonScheduledRoutes = [];
        acc.set(from, stopNonScheduledRoutes);
      }

      stopNonScheduledRoutes.push({ length: distance, to });
    }

    return acc;
  }, new Map());

  // TBM stops & routes

  const dbTBMScheduledRoutes = (
    (await TBMScheduledRoutesModel.find<DocumentType<TBMScheduledRoute>>({}, dbTBMScheduledRoutesProjection)
      .populate("trips.schedules", { ...schedulesProjection, ...dbTBMSchedulesProjection, _id: 0, __t: 0 })
      .lean()
      .exec()) as TBMScheduledRoute[]
  ).map(({ _id, stops, trips }) => ({
    _id,
    stops: stops.map((stop) => mapStopId(Providers.TBM, stop)),
    trips,
  }));

  const TBMStops = dbTBMScheduledRoutes.reduce<Map<number, [number[], Exclude<ReturnType<(typeof dbNonScheduledRoutes)["get"]>, undefined>]>>(
    (acc, { _id: routeId, stops }) => {
      for (const stopId of stops) {
        let stop = acc.get(stopId);
        if (!stop) {
          stop = [[], dbNonScheduledRoutes.get(stopId) ?? []];
          acc.set(stopId, stop);
        }

        stop[0].push(mapRouteId(Providers.TBM, routeId));
      }

      return acc;
    },
    new Map(
      (
        (await TBMStopsModel.find<DocumentType<TBMStop>>({ coords: { $not: { $elemMatch: { $eq: Infinity } } } }, dbTBMStopProjection)
          .lean()
          .exec()) as TBMStop[]
      ).map(({ _id }) => {
        const mappedId = mapStopId(Providers.TBM, _id);

        return [mappedId, [[], dbNonScheduledRoutes.get(mappedId) ?? []]];
      }),
    ),
  );

  // SNCF stops & routes

  const dbSNCFScheduledRoutes = (
    (await SNCFScheduledRoutesModel.find<DocumentType<SNCFScheduledRoute>>({}, dbSNCFScheduledRoutesProjection)
      .populate("trips.schedules", { ...schedulesProjection, ...dbSNCFSchedulesProjection, _id: 0 })
      .lean()
      .exec()) as SNCFScheduledRoute[]
  ).map(({ _id, stops, trips }) => ({
    _id,
    stops: stops.map((stop) => mapStopId(Providers.SNCF, stop)),
    trips,
  }));

  const SNCFStops = dbSNCFScheduledRoutes.reduce<Map<number, [number[], Exclude<ReturnType<(typeof dbNonScheduledRoutes)["get"]>, undefined>]>>(
    (acc, { _id: routeId, stops }) => {
      for (const stopId of stops) {
        let stop = acc.get(stopId);
        if (!stop) {
          stop = [[], dbNonScheduledRoutes.get(stopId) ?? []];
          acc.set(stopId, stop);
        }

        stop[0].push(mapRouteId(Providers.SNCF, routeId));
      }

      return acc;
    },
    new Map(
      (
        (await SNCFStopsModel.find<DocumentType<SNCFStop>>({ coords: { $not: { $elemMatch: { $eq: Infinity } } } }, dbSNCFStopProjection)
          .lean()
          .exec()) as SNCFStop[]
      ).map(({ _id }) => {
        const mappedId = mapStopId(Providers.SNCF, _id);

        return [mappedId, [[], dbNonScheduledRoutes.get(mappedId) ?? []]];
      }),
    ),
  );
  return {
    TBMStops,
    SNCFStops,
    dbTBMScheduledRoutes,
    dbSNCFScheduledRoutes,
    dbNonScheduledRoutes,
    TBMSchedulesModel,
    resultModel,
    mapStopId,
    unmapStopId,
    mapRouteId,
    unmapRouteId,
  };
}

function getArgsOptNumber(args: ReturnType<typeof minimist>, opt: string): number | null {
  if (opt in args) {
    if (typeof args[opt] === "number") return args[opt];

    console.warn(`Supplied "${opt}" was not of type number`, args[opt]);
  }

  return null;
}

type DataType = "scalar" | "interval";

function computeRAPTORData(
  { TBMStops, SNCFStops, dbTBMScheduledRoutes, dbSNCFScheduledRoutes, mapRouteId }: Awaited<ReturnType<typeof queryData>>,
  dataType: DataType,
  /** In ms, [neg, pos] */
  delay: [number, number] | null,
) {
  const scheduleMapperInt =
    <T extends Schedule>(getBaseArr: (schedule: T) => Timestamp, getBaseDep: (schedule: T) => Timestamp) =>
    (schedule: T): NonNullable<ReturnType<Trip<InternalTimeInt>["at"]>> => {
      if (delay)
        return [
          [getBaseArr(schedule) - delay[0], getBaseArr(schedule) + delay[1]] satisfies InternalTimeInt,
          [getBaseDep(schedule) - delay[0], getBaseDep(schedule) + delay[1]] satisfies InternalTimeInt,
        ];
      else {
        return [
          schedule.arr_int_hor.map((date) => date.getTime()) as [number, number],
          schedule.dep_int_hor.map((date) => date.getTime()) as [number, number],
        ];
      }
    };

  return [
    dataType === "scalar" ? TimeScal : TimeInt,
    [
      ...TBMStops.entries().map(
        ([id, [connectedRoutes, nonScheduledRoutes]]) => [id, connectedRoutes, nonScheduledRoutes] satisfies [unknown, unknown, unknown],
      ),
      ...SNCFStops.entries().map(
        ([id, [connectedRoutes, nonScheduledRoutes]]) => [id, connectedRoutes, nonScheduledRoutes] satisfies [unknown, unknown, unknown],
      ),
    ],
    [
      ...dbTBMScheduledRoutes.map(
        ({ _id, stops, trips }) =>
          [
            // Don't forget to finally map route ID!
            mapRouteId(Providers.TBM, _id),
            stops,
            trips.map(({ schedules }) =>
              // Make schedules intervals
              schedules.map<NonNullable<ReturnType<Trip<Timestamp | InternalTimeInt>["at"]>>>(
                dataType === "interval"
                  ? scheduleMapperInt(
                      (schedule) => schedule.hor_theo.getTime(),
                      (schedule) => schedule.hor_theo.getTime(),
                    )
                  : (schedule) => [schedule.hor_theo.getTime(), schedule.hor_theo.getTime()] as [number, number],
              ),
            ),
          ] satisfies [unknown, unknown, unknown],
      ),
      ...dbSNCFScheduledRoutes.map(
        ({ _id, stops, trips }) =>
          [
            // Don't forget to finally map route ID!
            mapRouteId(Providers.SNCF, _id),
            stops,
            trips.map(({ schedules }) =>
              schedules.map<NonNullable<ReturnType<Trip<Timestamp | InternalTimeInt>["at"]>>>(
                dataType === "interval"
                  ? scheduleMapperInt(
                      (schedule) => schedule.baseArrival.getTime(),
                      (schedule) => schedule.baseDeparture.getTime(),
                    )
                  : (schedule) => [schedule.baseArrival.getTime(), schedule.baseDeparture.getTime()] as [number, number],
              ),
            ),
          ] satisfies [unknown, unknown, unknown],
      ),
    ],
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

function postTreatment<TimeVal extends Timestamp | InternalTimeInt, V1, CA1 extends [V1, string][], V2, CA2 extends [V2, string][]>(
  postCriteria: Criterion<TimeVal, SharedID, number, V2, CA2[number][1]>[],
  data: IRAPTORData<TimeVal, SharedID, number>,
  instanceType: InstanceType,
  results: ReturnType<BaseRAPTOR<TimeVal, SharedID, number, V1, CA1>["getBestJourneys"]>,
  pt: SharedID,
) {
  const timeType = data.timeType;

  for (const postCriterion of postCriteria) {
    // Add success proba as post treatment
    results = results.map((journeys) =>
      journeys.map((journey) => {
        const measured = measureJourney(
          postCriterion,
          timeType,
          (instanceType === "McSharedRAPTOR"
            ? journey.map((js) => convertJourneyStep<TimeVal, V1, CA1>(data as SharedRAPTORData<TimeVal>)(js))
            : journey) as unknown as Journey<TimeVal, SharedID, number, V1, CA1>,
          pt,
        );

        return instanceType === "McSharedRAPTOR"
          ? measured.map((js) => convertBackJourneyStep<TimeVal, V1 | V2, [...CA1, [V2, CA2[number][1]]]>(data as SharedRAPTORData<TimeVal>)(js))
          : measured;
      }),
    ) as unknown as typeof results;
  }

  return results;
}

async function insertResults<TimeVal extends Timestamp | InternalTimeInt, V, CA extends [V, string][]>(
  resultModel: Awaited<ReturnType<typeof queryData>>["resultModel"],
  unmapStopId: Awaited<ReturnType<typeof queryData>>["unmapStopId"],
  unmapRouteId: Awaited<ReturnType<typeof queryData>>["unmapRouteId"],
  timeType: Time<TimeVal>,
  from: [mappedId: number, LocationAddress | LocationTBM],
  to: [mappedId: number, LocationAddress | LocationTBM],
  departureTime: TimeVal,
  settings: RAPTORRunSettings,
  results: ReturnType<BaseRAPTOR<TimeVal, SharedID, number, V, CA>["getBestJourneys"]>,
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
      .sort((a, b) => timeType.strict.order(a.at(-1)!.label.time, b.at(-1)!.label.time))
      .map((journey) =>
        journeyDBFormatter<V, CA>(
          [from[0], from[1].id as UnpackRefType<(typeof from)[1]["id"]>],
          [to[0], to[1].id as UnpackRefType<(typeof from)[1]["id"]>],
          unmapStopId,
          unmapRouteId,
          // @ts-expect-error Giving Timestamp | InternalTimeInt as TimeVal instead of InternalTimeInt but it's safe, just copying time field
          // It will try to write a Timestamp instead of a InternalTimeInt, so model validation should fail
          journey,
        ),
      ),
    settings,
  });

  return _id;
}

function man() {
  console.log(`
Command-line interface:
  h, help, -h, --h, --help: see this message
  --fp-req-len=<int>: maximum foot paths' length to retrieve and store un RAPTOR data
  --fp-run-len=<int>: maximum foot paths' length to consider during itineraries search
  (-d[ ] | --d=)<scal | int>: time data type, scalar or interval
  --delay-pos=<int>: positive delay (in sec), interval time only
  --delay-neg=<int>: negative delay (in sec), interval time only
  (-i[ ] | --i=)<r | sr | mcr | mcsr>: instance type, RAPTOR or SharedRAPTOR or MultiCriteriaRAPTOR or MultiCriteriaSharedRAPTOR
  --shared-secure: with a Shared instance type, check all RAPTOR data calls
  --createTimes=<int>: number of times to run the instance creation step
  --runTimes=<int>: number of times to run the itinerary search step
  --getResTimes=<int>: number of times to run the results retrieval step
  --fd, --bt, --spi: add criterion to a MultiCriteria instance, foot distance or buffer time or success probability (interval time)
  --fd=post, --bt=post, --spi=post: add post-criterion (measurement) to a MultiCriteria instance, foot distance or buffer time or success probability (interval time)
  --save: save results in database
  --ps=<int>: source stop in source database for the itinerary query
  --pt=<int>: target stop in source database for the itinerary query
`);
}

// Main IIFE test function
(async () => {
  // Setup params from command line
  const args = minimist(process.argv);
  console.debug(`Using args`, args);

  if (("h" in args && args.h === true) || ("help" in args && args.help === true) || args._.includes("h") || args._.includes("help")) {
    man();

    return;
  }

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

  const criteria = [] as Combinations<[typeof footDistance, typeof bufferTime, typeof successProbaInt]>;
  const postCriteria: (typeof footDistance | typeof bufferTime | typeof successProbaInt)[] = [];
  if ("fd" in args) {
    if (args.fd === true) (criteria as [typeof footDistance]).push(footDistance);
    else if (args.fd === "post") postCriteria.push(footDistance);
  }
  if ("bt" in args) {
    if (args.bt === true) (criteria as [typeof bufferTime]).push(bufferTime);
    else if (args.bt === "post") postCriteria.push(bufferTime);
  }
  if ("spi" in args) {
    if (dataType !== "interval") console.warn(`Ignoring "${successProbaInt.name}" criterion because data type isn't interval`);
    else {
      if (args.spi === true) (criteria as [typeof successProbaInt]).push(successProbaInt);
      else if (args.spi === "post") postCriteria.push(successProbaInt);
    }
  }

  console.debug(
    "Using criteria",
    criteria.map((c) => c.name),
  );
  console.debug(
    "Using post-criteria (measurement)",
    postCriteria.map((c) => c.name),
  );
  if (criteria.length && instanceType !== "McRAPTOR" && instanceType !== "McSharedRAPTOR")
    console.warn("Got some criteria but instance type is uni-criteria.");

  const saveResults = "save" in args && args.save === true ? true : false;
  console.debug(`Saving results`, saveResults);

  const b1 = await benchmark(queryData, [fpReqLen]);
  const queriedData = b1.lastReturn;
  if (!queriedData) throw new Error("No queried data");

  // Setup source & destination
  let ps: number;
  let from: LocationAddress | LocationTBM;

  const psOpt = getArgsOptNumber(args, "ps");
  if (psOpt === null) {
    ps = queriedData.mapStopId(Providers.TBM, 974); // Barrière d'Ornano
    from = { type: PointType.Address, id: 174287 };
  } else {
    ps = queriedData.mapStopId(Providers.TBM, psOpt);
    from = { type: PointType.TBMStop, id: ps };
  }
  // Fake stop ID, foot proxy to ps
  const psRawId = 1_000_000;
  let psId: number | SharedID = psRawId;

  const pt = queriedData.mapStopId(
    Providers.TBM,
    getArgsOptNumber(args, "pt") ??
      // Béthanie
      3846,
  );

  // Compute RAPTOR data

  const distances: Record<number, number> = {
    // Need the true ps
    [ps]: 100,
  };

  const b2 = await benchmark(computeRAPTORData, [queriedData, dataType, delay]);
  const rawRAPTORData = b2.lastReturn;
  if (!rawRAPTORData) throw new Error("No raw RAPTOR data");

  let rawSharedRAPTORData: Awaited<ReturnType<typeof computeSharedRAPTORData>>;

  if (instanceType === "SharedRAPTOR" || instanceType === "McSharedRAPTOR") {
    // Shared-specific RAPTOR data computation

    const b3 = await benchmark(computeSharedRAPTORData, [rawRAPTORData, dataType]);
    if (!b3.lastReturn) throw new Error("No raw Shared RAPTOR data");
    rawSharedRAPTORData = b3.lastReturn;

    psId = SharedRAPTORData.serializeId(psRawId);
  }

  // Create RAPTOR

  type CA = Combinations<[[number, "footDistance"], [number, "bufferTime"], [number, "successProbaInt"]]>;

  const b4 = await (instanceType === "RAPTOR"
    ? benchmark(createRAPTOR<Timestamp | InternalTimeInt>, [rawRAPTORData], undefined, createTimes)
    : instanceType === "SharedRAPTOR"
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        benchmark(createSharedRAPTOR<Timestamp | InternalTimeInt>, [rawSharedRAPTORData!], undefined, createTimes)
      : instanceType === "McRAPTOR"
        ? benchmark(
            createMcRAPTOR<Timestamp | InternalTimeInt, number, CA>,
            [rawRAPTORData, criteria as Parameters<typeof createMcRAPTOR<Timestamp | InternalTimeInt, number, CA>>[1]],
            undefined,
            createTimes,
          )
        : benchmark(
            createMcSharedRAPTOR<Timestamp | InternalTimeInt, number, CA>,
            [
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              rawSharedRAPTORData!,
              criteria as Parameters<typeof createMcSharedRAPTOR<Timestamp | InternalTimeInt, number, CA>>[1],
            ],
            undefined,
            createTimes,
          ));
  if (!b4.lastReturn) throw new Error("No RAPTOR instance");
  const [RAPTORDataInst, RAPTORInstance] = b4.lastReturn as readonly [
    Omit<IRAPTORData<Timestamp | InternalTimeInt, SharedID, number>, "attachStops"> & {
      attachStops: SharedRAPTORData<Timestamp | InternalTimeInt>["attachStops"];
    },
    BaseRAPTOR<Timestamp | InternalTimeInt, SharedID, number, number, CA>,
  ];

  if (sharedSecure) (RAPTORDataInst as SharedRAPTORData<Timestamp | InternalTimeInt>).secure = true;

  // Attach stops

  const attachStops = new Map<number, ConstructorParameters<typeof Stop<number, number>>>();

  attachStops.set(psRawId, [
    psRawId,
    [],
    Object.keys(distances).map((k) => {
      const sId = parseInt(k);

      return { to: sId, length: distances[sId] };
    }),
  ]);

  Object.keys(distances).forEach((k) => {
    const sId = parseInt(k);

    attachStops.set(sId, [sId, [], [{ to: psRawId, length: distances[sId] }]]);
  });

  RAPTORDataInst.attachStops(Array.from(attachStops.values()));

  // Run params

  // https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/#-sort----limit-coalescence
  const minSchedule = (
    await queriedData.TBMSchedulesModel.find({ hor_theo: { $gt: new Date(0) } })
      .sort({ hor_theo: 1 })
      .limit(1)
  ).at(0)?.hor_theo;
  const maxSchedule = (await queriedData.TBMSchedulesModel.find().sort({ hor_theo: -1 }).limit(1)).at(0)?.hor_theo;
  if (!minSchedule || !maxSchedule) throw new Error("Could not find latest & oldest TBM schedules");

  const meanSchedule = new Date(Math.round((minSchedule.getTime() + maxSchedule.getTime()) / 2)).getTime();
  const departureTime = dataType === "interval" ? ([meanSchedule, meanSchedule] satisfies [unknown, unknown]) : meanSchedule;

  const settings: RAPTORRunSettings = { walkSpeed: 1.5, maxTransferLength: fpRunLen };

  // Run

  function runRAPTOR() {
    RAPTORInstance.run(psId, pt, departureTime, settings);
  }
  console.log(
    `Running with: ps=${psId}, pt=${pt}, departure time=${new Date(typeof departureTime === "number" ? departureTime : departureTime[0]).toLocaleString()}, settings=${JSON.stringify(settings)}`,
  );
  await benchmark(runRAPTOR, [], undefined, runTimes);

  // Get results

  function resultRAPTOR() {
    return RAPTORInstance.getBestJourneys(pt);
  }
  const b6 = await benchmark(resultRAPTOR, [], undefined, getResTimes);
  if (!b6.lastReturn) throw new Error(`No best journeys`);
  console.debug("Best journeys", inspect(b6.lastReturn, false, 6));

  const b7 = await benchmark(postTreatment<Timestamp | InternalTimeInt, number, CA, number, CA>, [
    postCriteria as Criterion<number | InternalTimeInt, SharedID, number, number, "footDistance" | "bufferTime" | "successProbaInt">[],
    RAPTORDataInst,
    instanceType,
    b6.lastReturn,
    pt,
  ]);
  if (!b7.lastReturn) throw new Error(`No post treatment`);
  console.debug("Post treatment", inspect(b7.lastReturn, false, 6));

  if (saveResults) {
    // Save results

    const b8 = await benchmark(insertResults<Timestamp | InternalTimeInt, number, CA>, [
      queriedData.resultModel,
      queriedData.unmapStopId,
      queriedData.unmapRouteId,
      RAPTORDataInst.timeType,
      [psRawId, from],
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      [pt, { type: PointType.TBMStop, id: queriedData.unmapStopId(pt)![0] }],
      departureTime,
      settings,
      b7.lastReturn,
    ]);
    console.log("Saved result id", b8.lastReturn);
  }
})()
  .then(() => {
    console.log("Main ended");
    exit(0);
  })
  .catch(console.error);
