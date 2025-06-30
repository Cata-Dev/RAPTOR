import { dbAddresses, dbAddressesModel } from "./addresses.model";
import { dbIntersections, dbIntersectionsModel } from "./intersections.model";
import { dbSections, dbSectionsModel } from "./sections.model";
import { dbTBM_Lines, dbTBM_LinesModel } from "./TBM_lines.model";
import { dbTBM_Lines_routes, dbTBM_Lines_routesModel } from "./TBM_lines_routes.model";
import { dbTBM_Schedules, dbTBM_Schedules_rt, dbTBM_Schedules_rtModel, dbTBM_SchedulesModel } from "./TBM_schedules.model";
import { dbTBM_Stops, dbTBM_StopsModel } from "./TBM_stops.model";
import { dbTBM_Trips, dbTBM_TripsModel } from "./TBM_trips.model";
import { dbTBM_ScheduledRoutes, dbTBM_ScheduledRoutesModel } from "./TBMScheduledRoutes.model";

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
  ? dbAddresses
  : E extends TBMEndpoints.Intersections
    ? dbIntersections
    : E extends TBMEndpoints.Sections
      ? dbSections
      : E extends TBMEndpoints.Lines
        ? dbTBM_Lines
        : E extends TBMEndpoints.Lines_routes
          ? dbTBM_Lines_routes
          : E extends TBMEndpoints.Schedules
            ? dbTBM_Schedules
            : E extends TBMEndpoints.Schedules_rt
              ? dbTBM_Schedules_rt
              : E extends TBMEndpoints.Stops
                ? dbTBM_Stops
                : E extends TBMEndpoints.Trips
                  ? dbTBM_Trips
                  : E extends TBMEndpoints.ScheduledRoutes
                    ? dbTBM_ScheduledRoutes
                    : never;

type TBMModel<E extends TBMEndpoints = TBMEndpoints> = E extends TBMEndpoints.Addresses
  ? dbAddressesModel
  : E extends TBMEndpoints.Intersections
    ? dbIntersectionsModel
    : E extends TBMEndpoints.Sections
      ? dbSectionsModel
      : E extends TBMEndpoints.Lines
        ? dbTBM_LinesModel
        : E extends TBMEndpoints.Lines_routes
          ? dbTBM_Lines_routesModel
          : E extends TBMEndpoints.Schedules
            ? dbTBM_SchedulesModel
            : E extends TBMEndpoints.Schedules_rt
              ? dbTBM_Schedules_rtModel
              : E extends TBMEndpoints.Stops
                ? dbTBM_StopsModel
                : E extends TBMEndpoints.Trips
                  ? dbTBM_TripsModel
                  : E extends TBMEndpoints.ScheduledRoutes
                    ? dbTBM_ScheduledRoutesModel
                    : never;

export { TBMEndpoints };
export type { TBMClass, TBMModel };
