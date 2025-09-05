// TBMScheduledRoutes-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { TBMEndpoints } from "@bibm/data/models/TBM/index";
import { dbTBM_Lines_routes } from "@bibm/data/models/TBM/TBM_lines_routes.model";
import { dbTBM_Stops } from "@bibm/data/models/TBM/TBM_stops.model";
import { deleteModelWithClass, getModelForClass, prop, type Ref, type ReturnModelType } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { Connection } from "mongoose";
import { dbTBM_Schedules_rt, default as TBMSchedulesRtInit } from "./TBM_schedules.model";

@modelOptions({ schemaOptions: { _id: false } })
export class TripOfScheduledRoute {
  @prop({ required: true })
  public tripId!: number;

  @prop({ required: true, ref: () => dbTBM_Schedules_rt, type: () => Number })
  public schedules!: Ref<dbTBM_Schedules_rt>[];
}

@modelOptions({ options: { customName: TBMEndpoints.ScheduledRoutes } })
export class dbTBM_ScheduledRoutes extends TimeStamps {
  @prop({ required: true, ref: () => dbTBM_Lines_routes, type: () => Number })
  public _id!: Ref<dbTBM_Lines_routes>;

  @prop({ required: true, type: () => TripOfScheduledRoute })
  public trips!: TripOfScheduledRoute[];

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public stops!: Ref<dbTBM_Stops>[];
}

export default function init(db: Connection): ReturnModelType<typeof dbTBM_ScheduledRoutes> {
  TBMSchedulesRtInit(db);

  deleteModelWithClass(dbTBM_ScheduledRoutes);

  return getModelForClass(dbTBM_ScheduledRoutes, {
    existingConnection: db,
  });
}

export type dbTBM_ScheduledRoutesModel = ReturnType<typeof init>;
