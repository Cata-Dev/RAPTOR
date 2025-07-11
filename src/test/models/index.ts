import { ReturnModelType } from "@typegoose/typegoose";
import { dbAddresses } from "./addresses.model";
import { dbIntersections } from "./intersections.model";
import { dbSections } from "./sections.model";
import { dbTBM_Lines } from "./TBM_lines.model";
import { dbTBM_Lines_routes } from "./TBM_lines_routes.model";
import { dbTBM_Schedules, dbTBM_Schedules_rt } from "./TBM_schedules.model";
import { dbTBM_Stops } from "./TBM_stops.model";
import { dbTBM_Trips } from "./TBM_trips.model";
import { dbTBM_ScheduledRoutes } from "./TBMScheduledRoutes.model";

enum TBMEndpoints {
  Addresses = "Addresses",
  Intersections = "Intersections",
  Sections = "Sections",
  Stops = "TBM_Stops",
  Lines = "TBM_Lines",
  // 2 different endpoints in 1 collection
  Schedules = "TBM_Schedules",
  Schedules_rt = "TBM_Schedules_rt",
  Trips = "TBM_Trips",
  Lines_routes = "TBM_Lines_routes",
  ScheduledRoutes = "TBM_Scheduled_routes",
  RouteSections = "TBM_Route_sections",
  LinkLineRoutesSections = "TBM_Link_line_routes_sections",
}

type TBMClass<E extends TBMEndpoints = TBMEndpoints> = E extends TBMEndpoints.Addresses
  ? typeof dbAddresses
  : E extends TBMEndpoints.Intersections
    ? typeof dbIntersections
    : E extends TBMEndpoints.Sections
      ? typeof dbSections
      : E extends TBMEndpoints.Lines
        ? typeof dbTBM_Lines
        : E extends TBMEndpoints.Lines_routes
          ? typeof dbTBM_Lines_routes
          : E extends TBMEndpoints.Schedules
            ? typeof dbTBM_Schedules
            : E extends TBMEndpoints.Schedules_rt
              ? typeof dbTBM_Schedules_rt
              : E extends TBMEndpoints.Stops
                ? typeof dbTBM_Stops
                : E extends TBMEndpoints.Trips
                  ? typeof dbTBM_Trips
                  : E extends TBMEndpoints.ScheduledRoutes
                    ? typeof dbTBM_ScheduledRoutes
                    : never;

type TBMModel<E extends TBMEndpoints = TBMEndpoints> = ReturnModelType<TBMClass<E>>;

export { TBMEndpoints };
export type { TBMClass, TBMModel };
