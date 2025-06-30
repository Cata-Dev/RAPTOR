// tbm_vehicles-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { deleteModelWithClass, getModelForClass, prop, type Ref, type ReturnModelType } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { Mongoose } from "mongoose";
import { TBMEndpoints } from ".";
import { dbTBM_Lines } from "./TBM_lines.model";
import { dbTBM_Lines_routes } from "./TBM_lines_routes.model";
import { dbTBM_Stops } from "./TBM_stops.model";

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

  @prop({ required: true, ref: () => dbTBM_Lines_routes, type: () => Number, index: true })
  public rs_sv_chem_l!: Ref<dbTBM_Lines_routes, number>;
}

export default function init(db: Mongoose): ReturnModelType<typeof dbTBM_Trips> {
  if (getModelForClass(dbTBM_Trips, { existingMongoose: db })) deleteModelWithClass(dbTBM_Trips);

  return getModelForClass(dbTBM_Trips, { existingMongoose: db });
}

export type dbTBM_TripsModel = ReturnType<typeof init>;
