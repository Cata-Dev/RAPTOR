// addresses-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

export function approachedStopName(_id: number) {
  return `as=${_id}` as const;
}

import { deleteModelWithClass, getModelForClass, prop, type Ref, type ReturnModelType } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { Connection } from "mongoose";
import { dbTBM_Stops } from "./TBM_stops.model";
import { dbSections } from "./sections.model";

@modelOptions({ options: { customName: "NonScheduledRoutes" } })
export class dbFootPaths {
  @prop({ required: true, index: true, ref: () => dbTBM_Stops, type: () => Number })
  public from!: Ref<dbTBM_Stops, number>;

  @prop({ required: true, index: true, ref: () => dbTBM_Stops, type: () => Number })
  public to!: Ref<dbTBM_Stops, number>;

  @prop({ required: true })
  public distance!: number;

  @prop()
  public path?: (dbSections["_id"] | ReturnType<typeof approachedStopName>)[]; // Ref[] to intersections | stops
}

export default function init(db: Connection): ReturnModelType<typeof dbFootPaths> {
  if (getModelForClass(dbFootPaths, { existingConnection: db })) deleteModelWithClass(dbFootPaths);

  return getModelForClass(dbFootPaths, { existingConnection: db });
}

export type dbFootPathsModel = ReturnType<typeof init>;
