// intersections-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { TBMEndpoints } from ".";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelForClass, prop } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { Mongoose } from "mongoose";

@modelOptions({ options: { customName: TBMEndpoints.Intersections } })
export class dbIntersections extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ type: () => [Number, Number], required: true })
  public coords!: [number, number];

  @prop({ required: true })
  public nature!: string;
}

export default function init(db: Mongoose) {
  if (getModelForClass(dbIntersections,  { existingMongoose: db })) deleteModelWithClass(dbIntersections);

  const dbIntersectionsSchema = buildSchema(dbIntersections, { existingMongoose: db });
  const dbIntersectionsModelRaw = db.model(getName(dbIntersections), dbIntersectionsSchema);

  return addModelToTypegoose(dbIntersectionsModelRaw, dbIntersections, {
    existingMongoose: db,
  });
}

export type dbIntersectionsModel = ReturnType<typeof init>;
