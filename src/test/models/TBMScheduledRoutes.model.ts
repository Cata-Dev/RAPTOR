// TBMScheduledRoutes-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { deleteModelWithClass, getModelForClass, prop, type Ref, type ReturnModelType } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { Mongoose } from "mongoose";
import { TBMEndpoints } from ".";
import { dbTBM_Schedules_rt, default as TBMSchedulesRtInit } from "./TBM_schedules.model";
import { dbTBM_Stops, default as TBMStopsInit } from "./TBM_stops.model";

@modelOptions({ schemaOptions: { _id: false } })
export class TripOfScheduledRoute {
  @prop({ required: true })
  public tripId!: number;

  @prop({ required: true, ref: () => dbTBM_Schedules_rt, type: () => Number })
  public schedules!: Ref<dbTBM_Schedules_rt, number>[];
}

@modelOptions({ options: { customName: TBMEndpoints.ScheduledRoutes } })
export class dbTBM_ScheduledRoutes extends TimeStamps {
  @prop({ required: true })
  // routeId
  public _id!: number;

  @prop({ required: true, type: () => TripOfScheduledRoute })
  public trips!: TripOfScheduledRoute[];

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public stops!: Ref<dbTBM_Stops, number>[];
}

export default function init(db: Mongoose): ReturnModelType<typeof dbTBM_ScheduledRoutes> {
  TBMSchedulesRtInit(db);
  TBMStopsInit(db);

  if (getModelForClass(dbTBM_ScheduledRoutes, { existingMongoose: db })) deleteModelWithClass(dbTBM_ScheduledRoutes);

  return getModelForClass(dbTBM_ScheduledRoutes, {
    existingMongoose: db,
  });
}

export type dbTBM_ScheduledRoutesModel = ReturnType<typeof init>;
