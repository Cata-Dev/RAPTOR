// addresses-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelForClass, prop, Ref } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { Mongoose } from "mongoose";
import { dbTBM_Stops } from "./TBM_stops.model";
import { dbFootGraphNodes } from "./FootGraph.model";

@modelOptions({ options: { customName: "footPaths" } })
export class dbFootPaths {
  @prop({ required: true, index: true, ref: () => dbTBM_Stops, type: () => Number })
  public from!: Ref<dbTBM_Stops, number>;

  @prop({ required: true, index: true, ref: () => dbTBM_Stops, type: () => Number })
  public to!: Ref<dbTBM_Stops, number>;

  @prop({ required: true })
  public distance!: number;

  @prop({ ref: () => dbFootGraphNodes, type: () => String })
  public path?: Ref<dbFootGraphNodes, dbFootGraphNodes["_id"]>[]; // Ref[] to intersections | stops
}

export default function init(db: Mongoose) {
  if (getModelForClass(dbFootPaths, { existingMongoose: db })) deleteModelWithClass(dbFootPaths);

  const dbFootPathsSchema = buildSchema(dbFootPaths, { existingMongoose: db });
  const dbFootPathsModelRaw = db.model(getName(dbFootPaths), dbFootPathsSchema);

  return addModelToTypegoose(dbFootPathsModelRaw, dbFootPaths, { existingMongoose: db });
}

export type dbFootPathsModel = ReturnType<typeof init>;
