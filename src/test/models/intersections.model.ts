// intersections-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { deleteModelWithClass, getModelForClass, prop, type ReturnModelType } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { Connection } from "mongoose";
import { TBMEndpoints } from ".";

@modelOptions({ options: { customName: TBMEndpoints.Intersections } })
export class dbIntersections extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ type: () => [Number, Number], required: true })
  public coords!: [number, number];

  @prop({ required: true })
  public nature!: string;

  /** Not used for now
  @prop({ required: true })
  public commune!: string;

  @prop({ required: true })
  public code_commune!: string;
  */
}

export default function init(db: Connection): ReturnModelType<typeof dbIntersections> {
  deleteModelWithClass(dbIntersections);

  return getModelForClass(dbIntersections, { existingConnection: db });
}

export type dbIntersectionsModel = ReturnType<typeof init>;
