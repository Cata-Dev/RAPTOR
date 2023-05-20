import initDB from "./utils/mongoose";

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "@abraham/reflection";

import stopsModelInit, { dbTBM_Stops } from "./models/TBM_stops.model";
import TBMSchedulesModelInit from "./models/TBM_schedules.model";
import TBMScheduledRoutesModelInit, { dbTBM_ScheduledRoutes } from "./models/TBMScheduledRoutes.model";
import NonScheduledRoutesModelInit, { dbFootPaths } from "./models/NonScheduledRoutes.model";
import RAPTOR from "../main";
import { HydratedDocument } from "mongoose";
import { DocumentType, isDocument } from "@typegoose/typegoose";
import { binaryFilter, unpackRefType } from "./utils/ultils";
import { stopId } from "../utils/Structures";
import { benchmark } from "./utils/benchmark";

// Main IIFE test function
(async () => {
  const db = await initDB();
  const stopsModel = stopsModelInit(db);
  TBMSchedulesModelInit(db);
  const TBMScheduledRoutesModel = TBMScheduledRoutesModelInit(db);
  const NonScheduledRoutesModel = NonScheduledRoutesModelInit(db);

  async function queryData() {
    const dbScheduledRoutesProjection: Partial<Record<keyof dbTBM_ScheduledRoutes, 1>> = { _id: 1, stops: 1, trips: 1 };
    type dbScheduledRoute = Pick<dbTBM_ScheduledRoutes, keyof typeof dbScheduledRoutesProjection>;
    type ScheduledRoutesOverwritten = {
      stops: unpackRefType<dbScheduledRoute["stops"]>;
    };
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
    type NonScheduledRoutesOverwritten = {
      from: unpackRefType<dbNonScheduledRoute["from"]>;
      to: unpackRefType<dbNonScheduledRoute["to"]>;
    };
    type NonScheduledRoute = Omit<dbNonScheduledRoute, keyof NonScheduledRoutesOverwritten> & NonScheduledRoutesOverwritten;

    const dbNonScheduledRoutes = (await NonScheduledRoutesModel.find<HydratedDocument<DocumentType<NonScheduledRoute>>>(
      {},
      dbNonScheduledRoutesProjection,
    )
      .sort({ from: 1 })
      .lean()
      // Coords field type lost...
      .exec()) as NonScheduledRoute[];

    return { dbScheduledRoutes, dbStops, dbNonScheduledRoutes };
  }
  const b1 = await benchmark(queryData, []);
  console.log("b1 ended");
  if (!b1.lastReturn) throw `b1 return null`;
  const { dbScheduledRoutes, dbStops, dbNonScheduledRoutes } = b1.lastReturn;

  function createRAPTOR() {
    const RAPTORInstance = new RAPTOR(
      dbStops.map(({ _id, coords }) => [
        _id,
        ...coords,
        dbScheduledRoutes.filter((ScheduledRoute) => ScheduledRoute.stops.find((stopId) => stopId === _id)).map(({ _id }) => _id),
        binaryFilter(dbNonScheduledRoutes, _id, (stopFrom, NonScheduledRoute) => stopFrom - NonScheduledRoute.from).map(({ to, distance }) => ({
          to,
          length: distance,
        })),
      ]),
      dbScheduledRoutes.map(({ _id, stops, trips }) => [
        _id,
        [
          stops,
          trips.map(({ tripId, schedules }) => ({
            id: tripId,
            times: schedules.map((schedule) =>
              "hor_estime" in schedule ? [schedule.hor_estime.getTime(), schedule.hor_estime.getTime()] : [Infinity, Infinity],
            ),
          })),
        ],
      ]),
    );

    return { RAPTORInstance };
  }
  const b2 = await benchmark(createRAPTOR, []);
  console.log("b2 ended");
  if (!b2.lastReturn) throw `b2 return null`;
  const { RAPTORInstance } = b2.lastReturn;

  //From "Les Harmonies" to "Peixotto"
  const ps: stopId = 128738;
  const pt: stopId = 126798;

  let minSchedule = Infinity;
  for (const schedule of dbScheduledRoutes.flatMap(({ trips }) => trips.flatMap(({ schedules }) => schedules))) {
    if ("hor_estime" in schedule && schedule.hor_estime.getTime() < minSchedule && schedule.hor_estime.getTime() > 0)
      minSchedule = schedule.hor_estime.getTime();
  }

  function runRAPTOR() {
    RAPTORInstance.run(ps, pt, minSchedule, { walkSpeed: 8 });

    return true as const;
  }
  const b3 = await benchmark(runRAPTOR, []);
  console.log("b3 ended");
  if (!b3.lastReturn) throw `b3 return null`;

  function resultRAPTOR() {
    return RAPTORInstance.getBestJourney(ps, pt);
  }
  const b4 = await benchmark(resultRAPTOR, []);
  console.log("b4 ended");
  if (!b4.lastReturn) throw `b4 return null`;
  return b4.lastReturn;
})().then(console.log);
