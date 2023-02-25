// tbm_lines-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { TBMEndpoints } from ".";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelForClass, prop } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { Active, VehicleType } from "./TBM_stops.model";
import { Mongoose } from "mongoose";

@modelOptions({ options: { customName: TBMEndpoints.Lines } })
export class dbTBM_Lines extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ required: true })
  public libelle!: string;

  @prop({ required: true, enum: VehicleType })
  public vehicule!: VehicleType;

  @prop({ required: true, enum: [0, 1] as const })
  public active!: Active;
}

export default function init(db: Mongoose) {
  if (getModelForClass(dbTBM_Lines,  { existingMongoose: db })) deleteModelWithClass(dbTBM_Lines);

  const dbTBM_LinesSchema = buildSchema(dbTBM_Lines, { existingMongoose: db });
  const dbTBM_LinesModelRaw = db.model(getName(dbTBM_Lines), dbTBM_LinesSchema);

  return addModelToTypegoose(dbTBM_LinesModelRaw, dbTBM_Lines, { existingMongoose: db });
}

export type dbTBM_LinesModel = ReturnType<typeof init>;
