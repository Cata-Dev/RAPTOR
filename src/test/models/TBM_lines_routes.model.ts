// tbm_lines_routes-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { TBMEndpoints } from ".";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelForClass, prop, Ref } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { dbTBM_Lines } from "./TBM_lines.model";
import { dbTBM_Stops } from "./TBM_stops.model";
import { Mongoose } from "mongoose";

@modelOptions({ options: { customName: TBMEndpoints.Lines_routes } })
export class dbTBM_Lines_routes extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ required: true })
  public libelle!: string;

  @prop({ required: true })
  public sens!: string;

  @prop({ required: true })
  public vehicule!: string;

  @prop({ required: true, ref: () => dbTBM_Lines, type: () => Number })
  public rs_sv_ligne_a!: Ref<dbTBM_Lines, number>;

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public rg_sv_arret_p_nd!: Ref<dbTBM_Stops, number>;

  @prop({ required: true, ref: () => dbTBM_Stops, type: () => Number })
  public rg_sv_arret_p_na!: Ref<dbTBM_Stops, number>;
}

// for more of what you can do here.
export default function init(db: Mongoose) {
  if (getModelForClass(dbTBM_Lines_routes, { existingMongoose: db })) deleteModelWithClass(dbTBM_Lines_routes);

  const dbTBM_Lines_routesSchema = buildSchema(dbTBM_Lines_routes, { existingMongoose: db });
  const dbTBM_Lines_routesModelRaw = db.model(getName(dbTBM_Lines_routes), dbTBM_Lines_routesSchema);

  return addModelToTypegoose(dbTBM_Lines_routesModelRaw, dbTBM_Lines_routes, {
    existingMongoose: db,
  });
}

export type dbTBM_Lines_routesModel = ReturnType<typeof init>;
