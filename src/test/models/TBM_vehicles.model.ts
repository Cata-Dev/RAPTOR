// tbm_vehicles-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { InferSchemaType, Schema, model } from "mongoose";

const dbTBM_Vehicles = new Schema(
  {
    _id: { type: Number, required: true },
    etat: { type: String, required: true },
    rs_sv_ligne_a: { type: Number, ref: "lines" },
    rg_sv_arret_p_nd: { type: Number, required: true, ref: "stops" },
    rg_sv_arret_p_na: { type: Number, required: true, ref: "stops" },
    rs_sv_chem_l: { type: Number, ref: "lines_routes" },
  },
  {
    timestamps: true,
  },
);

export type dbTBM_Vehicles = InferSchemaType<typeof dbTBM_Vehicles>;

export default function (m: typeof model) {
  const modelName = "tbm_vehicles";
  return m(modelName, dbTBM_Vehicles);
}
