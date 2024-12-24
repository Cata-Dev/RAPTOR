// tbm_schedules-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelWithString, prop } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { Mongoose } from "mongoose";
import { FootStopsGraphNode } from "../footPaths/test";

@modelOptions({ options: { customName: "FootGraph" } })
export class dbFootGraph {
  @prop({ required: true })
  public distance!: number;

  @prop({ required: true, type: () => [String] })
  public ends!: [FootStopsGraphNode, FootStopsGraphNode];
}

export default function init(db: Mongoose) {
  if (getModelWithString(getName(dbFootGraph))) deleteModelWithClass(dbFootGraph);

  const dbFootGraphSchema = buildSchema(dbFootGraph, { existingMongoose: db });
  const dbFootGraphModelRaw = db.model(getName(dbFootGraph), dbFootGraphSchema);

  return addModelToTypegoose(dbFootGraphModelRaw, dbFootGraph, {
    existingMongoose: db,
  });
}

export type dbFootGraphModel = ReturnType<typeof init>;
