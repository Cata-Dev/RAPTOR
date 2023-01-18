// sections-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html
import { InferSchemaType, Schema, model } from "mongoose";

const dbSections = new Schema(
  {
    coords: { type: [[Number]], required: true },
    distance: { type: Number, required: true },
    _id: { type: Number, required: true },
    domanial: { type: Number, required: true },
    groupe: { type: Number, required: true },
    nom_voie: { type: String, required: true },
    rg_fv_graph_dbl: { type: Boolean, required: true },
    rg_fv_graph_nd: { type: Number, required: true, ref: "nodes" },
    rg_fv_graph_na: { type: Number, required: true, ref: "nodes" },
  },
  {
    timestamps: true,
  },
);

export type dbSections = Omit<InferSchemaType<typeof dbSections>, "coords"> & {
  coords: [number, number][]
};

export default function (m: typeof model) {
  const modelName = "sections";
  return m<dbSections>(modelName, dbSections);
}
