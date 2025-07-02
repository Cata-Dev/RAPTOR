// sections-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

export enum SectionDomanial {
  NonRenseigne = 0,
  Autoroute = 1,
  RouteNationale = 2,
  RouteDepartementale = 3,
  VoieMetropolitaine = 4,
  VoiePrivee = 5,
  CheminRural = 6,
  Autre = 7,
}

import { deleteModelWithClass, getModelForClass, prop, type ReturnModelType } from "@typegoose/typegoose";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { Connection } from "mongoose";
import { TBMEndpoints } from ".";

@modelOptions({ options: { customName: TBMEndpoints.Sections } })
export class dbSections extends TimeStamps {
  @prop({ required: true })
  public _id!: number;

  @prop({ type: () => [[Number, Number]], required: true })
  public coords!: [number, number][];

  @prop({ required: true })
  public distance!: number;

  @prop({ required: true, enum: SectionDomanial })
  public domanial!: SectionDomanial;

  @prop({ required: true })
  public groupe!: number;

  @prop({ required: true })
  public cat_dig!: number;

  @prop({ required: true })
  public nom_voie!: string;

  @prop({ required: true })
  public rg_fv_graph_dbl!: boolean;

  @prop({ required: true })
  public rg_fv_graph_nd!: number;

  @prop({ required: true })
  public rg_fv_graph_na!: number;
}

export default function init(db: Connection): ReturnModelType<typeof dbSections> {
  if (getModelForClass(dbSections, { existingConnection: db })) deleteModelWithClass(dbSections);

  return getModelForClass(dbSections, { existingConnection: db });
}

export type dbSectionsModel = ReturnType<typeof init>;
