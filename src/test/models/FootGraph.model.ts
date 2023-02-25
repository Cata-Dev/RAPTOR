// tbm_schedules-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import {
  addModelToTypegoose,
  buildSchema,
  deleteModelWithClass,
  getDiscriminatorModelForClass,
  getModelForClass,
  index,
  prop,
  Ref,
} from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { Mongoose } from "mongoose";
import { approachedStopName, dbIntersectionId, dbSectionId } from "../utils/ultils";

@modelOptions({ options: { customName: "FootGraph" } })
export class dbFootGraph {
  @prop({ required: true, type: () => String })
  public _id!: ReturnType<typeof approachedStopName> | ReturnType<typeof dbIntersectionId> | ReturnType<typeof dbSectionId>;
}

@modelOptions({ options: { customName: "FootGraphNode" } })
export class dbFootGraphNodes extends dbFootGraph {
  @prop({ required: true, type: () => String })
  public _id!: ReturnType<typeof approachedStopName> | ReturnType<typeof dbIntersectionId>;

  @prop({ required: true, type: () => [Number] })
  public coords!: [number, number];

  @prop()
  public stopId?: number;
}

@modelOptions({ options: { customName: "FootGraphEdge" } })
export class dbFootGraphEdges extends dbFootGraph {
  @prop({ required: true, type: () => String })
  public _id!: ReturnType<typeof dbSectionId>;

  @prop({ required: true })
  public distance!: number;

  @prop({ required: true, type: () => [[Number, Number]] })
  public coords!: [number, number][];

  @prop({ required: true, ref: () => dbFootGraphNodes, type: () => [String, String] })
  public ends!: [Ref<dbFootGraphNodes, dbFootGraphNodes["_id"]>, Ref<dbFootGraphNodes, dbFootGraphNodes["_id"]>];
}

export default function init(db: Mongoose) {
  if (getModelForClass(dbFootGraph, { existingMongoose: db })) deleteModelWithClass(dbFootGraph);
  if (getModelForClass(dbFootGraphNodes, { existingMongoose: db })) deleteModelWithClass(dbFootGraphNodes);
  if (getModelForClass(dbFootGraphEdges, { existingMongoose: db })) deleteModelWithClass(dbFootGraphEdges);

  const dbFootGraphSchema = buildSchema(dbFootGraph, { existingMongoose: db });
  const dbFootGraphModelRaw = db.model(getName(dbFootGraph), dbFootGraphSchema);

  const dbFootGraphModel = addModelToTypegoose(dbFootGraphModelRaw, dbFootGraph, {
    existingMongoose: db,
  });

  return [
    dbFootGraphModel,
    getDiscriminatorModelForClass(dbFootGraphModel, dbFootGraphNodes),
    getDiscriminatorModelForClass(dbFootGraphModel, dbFootGraphEdges),
  ] as const;
}

export type dbFootGraphModel = ReturnType<typeof init>[0];
export type dbFootGraphNodesModel = ReturnType<typeof init>[1];
export type dbFootGraphEdgesModel = ReturnType<typeof init>[2];
