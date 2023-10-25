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

import { TBMEndpoints } from ".";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { addModelToTypegoose, buildSchema, deleteModelWithClass, getModelForClass, prop, Ref } from "@typegoose/typegoose";
import { modelOptions } from "@typegoose/typegoose/lib/modelOptions";
import { getName } from "@typegoose/typegoose/lib/internal/utils";
import { dbIntersections } from "./intersections.model";
import { Mongoose } from "mongoose";

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

  @prop({ required: true, ref: () => dbIntersections, type: () => Number })
  public rg_fv_graph_nd!: Ref<dbIntersections, number>;

  @prop({ required: true, ref: () => dbIntersections, type: () => Number })
  public rg_fv_graph_na!: Ref<dbIntersections, number>;
}

export default function init(db: Mongoose) {
  if (getModelForClass(dbSections, { existingMongoose: db })) deleteModelWithClass(dbSections);

  const dbSectionsSchema = buildSchema(dbSections, { existingMongoose: db });
  const dbSectionsModelRaw = db.model(getName(dbSections), dbSectionsSchema);

  return addModelToTypegoose(dbSectionsModelRaw, dbSections, { existingMongoose: db });
}

export type dbSectionsModel = ReturnType<typeof init>;
