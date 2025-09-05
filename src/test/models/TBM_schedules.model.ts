// tbm_schedules-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

export enum RtScheduleState {
  Annule = "ANNULE",
  Non_realise = "NON_REALISE",
  Realise = "REALISE",
  Devie = "DEVIE",
}

export enum RtScheduleType {
  Regulier = "REGULIER",
  Deviation = "DEVIATION",
}

import { Schedule } from "@bibm/data/models/Compute/types";
import { TBMEndpoints } from "@bibm/data/models/TBM/index";
import { dbTBM_Stops } from "@bibm/data/models/TBM/TBM_stops.model";
import { dbTBM_Trips } from "@bibm/data/models/TBM/TBM_trips.model";
import {
  deleteModelWithClass,
  getDiscriminatorModelForClass,
  getModelForClass,
  index,
  prop,
  type Ref,
  type ReturnModelType,
} from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { Connection } from "mongoose";

@index({ _id: 1, realtime: 1 }, { unique: true })
@modelOptions({ options: { customName: TBMEndpoints.Schedules } })
export class dbTBM_Schedules extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ required: true })
  public hor_theo!: Date;

  @prop({ required: true })
  public realtime!: boolean;

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public rs_sv_arret_p!: Ref<dbTBM_Stops>;

  @prop({ required: true, ref: () => dbTBM_Trips, type: () => Number, index: true })
  public rs_sv_cours_a!: Ref<dbTBM_Trips>;
}

@modelOptions({ options: { customName: TBMEndpoints.Schedules_rt } })
export class dbTBM_Schedules_rt extends dbTBM_Schedules implements Schedule {
  @prop({ required: true })
  public hor_app!: Date;

  @prop({ required: true })
  public hor_estime!: Date;

  @prop({ required: true })
  public arr_int_hor!: [Date, Date];

  @prop({ required: true })
  public dep_int_hor!: [Date, Date];

  @prop({ required: true, enum: RtScheduleState })
  public etat!: RtScheduleState;

  @prop({ required: true, enum: RtScheduleType })
  public type!: RtScheduleType;
}

export default function init(db: Connection): readonly [ReturnModelType<typeof dbTBM_Schedules>, ReturnModelType<typeof dbTBM_Schedules_rt>] {
  deleteModelWithClass(dbTBM_Schedules);
  const dbTBM_SchedulesModel = getModelForClass(dbTBM_Schedules, { existingConnection: db });

  return [dbTBM_SchedulesModel, getDiscriminatorModelForClass(dbTBM_SchedulesModel, dbTBM_Schedules_rt)] as const;
}

export type dbTBM_SchedulesModel = ReturnType<typeof init>[0];
export type dbTBM_Schedules_rtModel = ReturnType<typeof init>[1];
