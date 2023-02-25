// tbm_stops-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { TBMEndpoints } from ".";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelForClass, prop } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { Mongoose } from "mongoose";

export enum VehicleType {
  Bus = "BUS",
  Tram = "TRAM",
  Bateau = "BATEAU",
}

export enum StopType {
  Classique = "CLASSIQUE",
  Delestage = "DELESTAGE",
  Autre = "AUTRE",
  Fictif = "FICTIF",
}

export type Active = 0 | 1;

@modelOptions({ options: { customName: TBMEndpoints.Stops } })
export class dbTBM_Stops extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ type: () => [Number, Number], required: true })
  public coords!: [number, number];

  @prop({ required: true })
  public libelle!: string;

  @prop({ required: true })
  public libelle_lowercase!: string;

  @prop({ required: true, enum: VehicleType })
  public vehicule!: VehicleType;

  @prop({ required: true, enum: StopType })
  public type!: StopType;

  @prop({ required: true, enum: [0, 1] as const })
  public actif!: Active;
}

// export type dbTBM_Stops = Omit<InferSchemaType<typeof dbTBM_Stops>, "coords"> & {
//   coords: [number, number];
// };

export default function init(db: Mongoose) {
  if (getModelForClass(dbTBM_Stops, { existingMongoose: db })) deleteModelWithClass(dbTBM_Stops);

  const dbTBM_StopsSchema = buildSchema(dbTBM_Stops, { existingMongoose: db });
  const dbTBM_StopsModelRaw = db.model(getName(dbTBM_Stops), dbTBM_StopsSchema);

  return addModelToTypegoose(dbTBM_StopsModelRaw, dbTBM_Stops, { existingMongoose: db });
}

export type dbTBM_StopsModel = ReturnType<typeof init>;
