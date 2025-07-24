// tbm_lines-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { type ReturnModelType, deleteModelWithClass, getModelForClass, prop } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { Connection } from "mongoose";
import { TBMEndpoints } from ".";
import { type Active, VehicleType } from "./TBM_stops.model";

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

export default function init(db: Connection): ReturnModelType<typeof dbTBM_Lines> {
  deleteModelWithClass(dbTBM_Lines);

  return getModelForClass(dbTBM_Lines, { existingConnection: db });
}

export type dbTBM_LinesModel = ReturnType<typeof init>;
