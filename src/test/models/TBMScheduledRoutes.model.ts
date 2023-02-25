// TBMScheduledRoutes-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelForClass, prop, Ref } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { dbTBM_Schedules } from "./TBM_schedules.model";
import { dbTBM_Stops } from "./TBM_stops.model";
import { TBMEndpoints } from ".";
import { Mongoose } from "mongoose";

@modelOptions({ schemaOptions: { _id: false } })
export class TripOfScheduledRoute {
  @prop({ required: true })
  public tripId!: number;

  @prop({ required: true, ref: () => dbTBM_Schedules })
  public schedules!: Ref<dbTBM_Schedules>[];
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

export default function init(db: Mongoose) {
  if (getModelForClass(dbTBM_ScheduledRoutes,  { existingMongoose: db })) deleteModelWithClass(dbTBM_ScheduledRoutes);

  const dbTBM_ScheduledRoutesSchema = buildSchema(dbTBM_ScheduledRoutes, {
    existingMongoose: db,
  });
  const dbTBM_ScheduledRoutesModelRaw = db.model(getName(dbTBM_ScheduledRoutes), dbTBM_ScheduledRoutesSchema);

  return addModelToTypegoose(dbTBM_ScheduledRoutesModelRaw, dbTBM_ScheduledRoutes, {
    existingMongoose: db,
  });
}

export type dbTBM_ScheduledRoutesModel = ReturnType<typeof init>;
