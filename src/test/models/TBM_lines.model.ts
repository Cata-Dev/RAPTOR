// tbm_lines-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { InferSchemaType, Schema, model } from "mongoose";

const dbTBM_Lines = new Schema(
  {
    _id: { type: Number, required: true },
    libelle: { type: String, required: true },
    vehicule: { type: String, enum: ["BUS", "TRAM", "BATEAU"], required: true },
    active: { type: Number, enum: [0, 1] as const, required: true },
  },
  {
    timestamps: true,
  },
);

export type dbTBM_Lines = InferSchemaType<typeof dbTBM_Lines>;

export default function (m: typeof model) {
  const modelName = "tbm_lines";
  return m(modelName, dbTBM_Lines);
}
