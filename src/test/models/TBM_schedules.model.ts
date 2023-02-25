// tbm_schedules-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

export enum RtScheduleState {
  Non_realise = "NON_REALISE",
  Realise = "REALISE",
  Devie = "DEVIE",
}

export enum RtScheduleType {
  Regulier = "REGULIER",
  Deviation = "DEVIATION",
}

import { TBMEndpoints } from ".";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { addModelToTypegoose, buildSchema, deleteModelWithClass, getDiscriminatorModelForClass, getModelForClass, index, prop, Ref } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { dbTBM_Stops } from "./TBM_stops.model";
import { dbTBM_Trips } from "./TBM_trips.model";
import { Mongoose } from "mongoose";

@index({ gid: 1, realtime: 1 }, { unique: true })
@index({ rs_sv_cours_a: 1 })
@modelOptions({ options: { customName: TBMEndpoints.Schedules } })
export class dbTBM_Schedules extends TimeStamps {
  @prop({ required: true, index: true })
  public gid!: number;

  @prop({ required: true })
  public hor_theo!: Date;

  @prop({ required: true })
  public realtime!: boolean;

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public rs_sv_arret_p!: Ref<dbTBM_Stops, number>;

  @prop({ required: true, ref: () => dbTBM_Trips, type: () => Number })
  public rs_sv_cours_a!: Ref<dbTBM_Trips, number>;
}

@modelOptions({ options: { customName: TBMEndpoints.Schedules_rt } })
export class dbTBM_Schedules_rt extends dbTBM_Schedules {
  @prop({ required: true })
  public hor_app!: Date;

  @prop({ required: true })
  public hor_estime!: Date;

  @prop({ required: true, enum: RtScheduleState })
  public etat!: RtScheduleState;

  @prop({ required: true, enum: RtScheduleType })
  public type!: RtScheduleType;
}

export default function init(db: Mongoose) {
  if (getModelForClass(dbTBM_Schedules,  { existingMongoose: db })) deleteModelWithClass(dbTBM_Schedules);
  if (getModelForClass(dbTBM_Schedules_rt,  { existingMongoose: db })) deleteModelWithClass(dbTBM_Schedules_rt);

  const dbTBM_SchedulesSchema = buildSchema(dbTBM_Schedules, { existingMongoose: db });
  const dbTBM_SchedulesModelRaw = db.model(getName(dbTBM_Schedules), dbTBM_SchedulesSchema);

  const dbTBM_SchedulesModel = addModelToTypegoose(dbTBM_SchedulesModelRaw, dbTBM_Schedules, {
    existingMongoose: db,
  });

  return [dbTBM_SchedulesModel, getDiscriminatorModelForClass(dbTBM_SchedulesModel, dbTBM_Schedules_rt)] as const;
}

export type dbTBM_SchedulesModel = ReturnType<typeof init>[0];
export type dbTBM_Schedules_rtModel = ReturnType<typeof init>[1];
