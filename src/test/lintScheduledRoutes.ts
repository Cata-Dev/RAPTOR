import initDB from "./utils/mongoose";

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "core-js/features/reflect";

import TBMScheduledRoutesModelInit, { dbTBM_ScheduledRoutes } from "./models/TBMScheduledRoutes.model";
import TBMLinesRoutesModelInit from "./models/TBM_lines.model";
import TBMLinesModelInit from "./models/TBM_lines_routes.model";

import { UnpackRefs } from "./utils";
import { benchmark } from "./utils/benchmark";

(async () => {
  async function queryData() {
    console.debug("Querying data...");
    const sourceDB = await initDB("bibm");

    TBMLinesRoutesModelInit(sourceDB);
    const TBMLinesRoutesModel = TBMLinesModelInit(sourceDB);

    const dbScheduledRoutesProjection = { _id: 1, stops: 1, trips: 1 } satisfies Partial<Record<keyof dbTBM_ScheduledRoutes, 1>>;
    type dbScheduledRoute = Pick<dbTBM_ScheduledRoutes, keyof typeof dbScheduledRoutesProjection>;
    type ScheduledRoutesOverwritten = UnpackRefs<dbScheduledRoute, "stops">;
    type ScheduledRoute = Omit<dbScheduledRoute, keyof ScheduledRoutesOverwritten> & ScheduledRoutesOverwritten;
    const TBMScheduledRoutesModel = TBMScheduledRoutesModelInit(sourceDB);

    return {
      dbScheduledRoutes: TBMScheduledRoutesModel.find({}, dbScheduledRoutesProjection).populate("trips.schedules").lean<ScheduledRoute>().cursor(),
      TBMScheduledRoutesModel,
      TBMLinesRoutesModel,
    };
  }

  async function lintScheduledRoutes({ dbScheduledRoutes, TBMScheduledRoutesModel, TBMLinesRoutesModel }: Awaited<ReturnType<typeof queryData>>) {
    // Lint schedules routes
    console.debug("Linting...");

    for await (const scheduledRoute of dbScheduledRoutes)
      for (const [tripIndex, trip] of scheduledRoute.trips.entries())
        for (const [i, schedule] of trip.schedules.entries())
          if (typeof schedule !== "object" || (schedule.rs_sv_arret_p !== Infinity && schedule.rs_sv_arret_p !== scheduledRoute.stops[i])) {
            const scheduledRoutePop = await TBMScheduledRoutesModel.populate(scheduledRoute, { path: "_id", options: { lean: true } });
            scheduledRoutePop._id = await TBMLinesRoutesModel.populate(scheduledRoutePop._id, { path: "rs_sv_ligne_a", options: { lean: true } });

            console.log(
              `Route ${typeof scheduledRoutePop._id === "object" ? `${typeof scheduledRoutePop._id.rs_sv_ligne_a === "object" ? scheduledRoutePop._id.rs_sv_ligne_a.libelle : scheduledRoutePop._id.rs_sv_ligne_a} ${scheduledRoutePop._id.libelle} (${scheduledRoutePop._id._id})` : scheduledRoutePop._id}, trip idx ${tripIndex} (${trip.tripId}): at idx ${i}, schedule's stop ${typeof schedule === "object" ? (schedule.rs_sv_arret_p as number) : `${schedule} [NOT POPULATED]`} !== stop ${scheduledRoute.stops[i]}`,
            );
          }
  }

  const b1 = await benchmark(queryData, []);
  if (!b1.lastReturn) throw new Error("No queried data");

  await benchmark(lintScheduledRoutes, [b1.lastReturn]);

  console.debug("Done.");
})()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
