import initDB from "./utils/mongoose";

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "core-js/features/reflect";

import stopsModelInit, { dbTBM_Stops } from "./models/TBM_stops.model";
import TBMSchedulesModelInit from "./models/TBM_schedules.model";
import TBMScheduledRoutesModelInit, { dbTBM_ScheduledRoutes } from "./models/TBMScheduledRoutes.model";
import NonScheduledRoutesModelInit, { dbFootPaths } from "./models/NonScheduledRoutes.model";
import RAPTOR from "../main";
import { RAPTORData, Stop } from "../Structures";
import { HydratedDocument, FilterQuery } from "mongoose";
import { DocumentType } from "@typegoose/typegoose";
import { unpackRefType } from "./footPaths/utils/ultils";
import { benchmark } from "./utils/benchmark";
import { mapAsync, wait } from "./utils";
import { inspect } from "util";

async function init() {
  const db = await initDB();
  const stopsModel = stopsModelInit(db);
  const TBMSchedulesModel = TBMSchedulesModelInit(db)[1];
  const TBMScheduledRoutesModel = TBMScheduledRoutesModelInit(db);
  const NonScheduledRoutesModel = NonScheduledRoutesModelInit(db);

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

    const dbStopProjection = { _id: 1, coords: 1 };
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
    const RAPTORInstance = new RAPTOR(
      new RAPTORData(
        await mapAsync<(typeof dbStops)[number], Stop<number, number>>(dbStops, async ({ _id, coords }) => ({
          id: _id,
          lat: coords[0],
          long: coords[1],
          connectedRoutes: dbScheduledRoutes.filter((ScheduledRoute) => ScheduledRoute.stops.find((stopId) => stopId === _id)).map(({ _id }) => _id),
          transfers: (await dbNonScheduledRoutes(_id, { distance: { $lte: 1_000 } })).map(({ to, distance }) => ({
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
                  "hor_estime" in schedule
                    ? ([
                        schedule.hor_estime.getTime() || RAPTORData.MAX_SAFE_TIMESTAMP,
                        schedule.hor_estime.getTime() || RAPTORData.MAX_SAFE_TIMESTAMP,
                      ] satisfies [unknown, unknown])
                    : ([Infinity, Infinity] satisfies [unknown, unknown]),
                ),
              })),
            ] satisfies [unknown, unknown, unknown],
        ),
      ),
    );

    return { RAPTORInstance };
  }
  const b2 = await benchmark(createRAPTOR, []);
  console.log("b2 ended");
  if (!b2.lastReturn) throw new Error(`b2 return null`);
  const { RAPTORInstance } = b2.lastReturn;

  return { RAPTORInstance, TBMSchedulesModel };
}

async function run({ RAPTORInstance, TBMSchedulesModel }: Awaited<ReturnType<typeof init>>) {
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
    pt = 2082;
  }

  const minSchedule = (await TBMSchedulesModel.findOne({}).lean())?.updatedAt?.getTime() ?? Infinity;

  function runRAPTOR() {
    RAPTORInstance.run(ps, pt, minSchedule, { walkSpeed: 1.5 });

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
  return b4.lastReturn;
}

// Main IIFE test function
(async () => {
  const initr = await init();

  while (true) {
    const r = await run(initr);
    console.log(inspect(r, false, 3));
    //Let time to debug
    await wait(10_000);
  }
})()
  .then(() => true)
  .catch(console.error);
