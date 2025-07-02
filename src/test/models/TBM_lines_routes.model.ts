// tbm_lines_routes-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { deleteModelWithClass, getModelForClass, prop, type Ref, type ReturnModelType } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { Connection } from "mongoose";
import { TBMEndpoints } from ".";
import { dbTBM_Lines } from "./TBM_lines.model";
import { dbTBM_Stops, VehicleType } from "./TBM_stops.model";

@modelOptions({ options: { customName: TBMEndpoints.Lines_routes } })
export class dbTBM_Lines_routes extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ required: true })
  public libelle!: string;

  @prop({ required: true })
  public sens!: string;

  @prop({ required: true })
  public vehicule!: VehicleType;

  @prop({ required: true, ref: () => dbTBM_Lines, type: () => Number })
  public rs_sv_ligne_a!: Ref<dbTBM_Lines, number>;

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public rg_sv_arret_p_nd!: Ref<dbTBM_Stops, number>;

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public rg_sv_arret_p_na!: Ref<dbTBM_Stops, number>;
}

// for more of what you can do here.
export default function init(db: Connection): ReturnModelType<typeof dbTBM_Lines_routes> {
  if (getModelForClass(dbTBM_Lines_routes, { existingConnection: db })) deleteModelWithClass(dbTBM_Lines_routes);

  return getModelForClass(dbTBM_Lines_routes, {
    existingConnection: db,
  });
}

export type dbTBM_Lines_routesModel = ReturnType<typeof init>;
