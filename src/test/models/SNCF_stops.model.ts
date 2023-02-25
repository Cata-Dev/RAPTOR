// sncf_stops-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelForClass, prop } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { SNCFEndpoints } from ".";
import { Mongoose } from "mongoose";

@modelOptions({ options: { customName: SNCFEndpoints.Stops } })
export class dbSNCF_Stops extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ type: () => [Number, Number], required: true })
  public coords!: [number, number];

  @prop({ required: true })
  public name!: string;

  @prop({ required: true })
  public name_lowercase!: string;
}

export default function init(db: Mongoose) {
  if (getModelForClass(dbSNCF_Stops,  { existingMongoose: db })) deleteModelWithClass(dbSNCF_Stops);

  const dbSNCF_StopsSchema = buildSchema(dbSNCF_Stops, { existingMongoose: db });
  const dbSNCF_StopsModelRaw = db.model(getName(dbSNCF_Stops), dbSNCF_StopsSchema);

  return addModelToTypegoose(dbSNCF_StopsModelRaw, dbSNCF_Stops, { existingMongoose: db });
}

export type dbSNCF_StopsModel = ReturnType<typeof init>;
