// tbm_lines_routes-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { InferSchemaType, Schema, model } from "mongoose";

const dbTBM_Lines_routes = new Schema(
  {
    _id: { type: Number, required: true },
    libelle: { type: String, required: true },
    sens: { type: String, required: true },
    vehicule: { type: String, required: true },
    rs_sv_ligne_a: { type: Number, required: true, ref: "lines" },
    rg_sv_arret_p_nd: { type: Number, required: true, ref: "stops" },
    rg_sv_arret_p_na: { type: Number, required: true, ref: "stops" },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
  },
);

export type dbTBM_Lines_routes = InferSchemaType<typeof dbTBM_Lines_routes>;

export default function (m: typeof model) {
  const modelName = "tbm_lines_routes";
  return m(modelName, dbTBM_Lines_routes);
}
