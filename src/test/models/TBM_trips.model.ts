// tbm_vehicles-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { TBMEndpoints } from ".";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelForClass, index, prop, Ref } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { dbTBM_Lines } from "./TBM_lines.model";
import { dbTBM_Stops } from "./TBM_stops.model";
import { dbTBM_Lines_routes } from "./TBM_lines_routes.model";
import { Mongoose } from "mongoose";

@index({ rs_sv_chem_l: 1 })
@modelOptions({ options: { customName: TBMEndpoints.Trips } })
export class dbTBM_Trips extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ required: true })
  public etat!: string;

  @prop({ required: true, ref: () => dbTBM_Lines, type: () => Number })
  public rs_sv_ligne_a!: Ref<dbTBM_Lines, number>;

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public rg_sv_arret_p_nd!: Ref<dbTBM_Stops, number>;

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public rg_sv_arret_p_na!: Ref<dbTBM_Stops, number>;

  @prop({ required: true, ref: () => dbTBM_Lines_routes, type: () => Number })
  public rs_sv_chem_l!: Ref<dbTBM_Lines_routes, number>;
}

export default function init(db: Mongoose) {
  if (getModelForClass(dbTBM_Trips,  { existingMongoose: db })) deleteModelWithClass(dbTBM_Trips);

  const dbTBM_TripsSchema = buildSchema(dbTBM_Trips, { existingMongoose: db });
  const dbTBM_TripsModelRaw = db.model(getName(dbTBM_Trips), dbTBM_TripsSchema);

  return addModelToTypegoose(dbTBM_TripsModelRaw, dbTBM_Trips, { existingMongoose: db });
}

export type dbTBM_TripsModel = ReturnType<typeof init>;
