// tbm_stops-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { InferSchemaType, Schema, model } from "mongoose";

const dbTBM_Stops = new Schema(
  {
    coords: { type: [Number], required: true },
    _id: { type: Number, required: true },
    libelle: { type: String, required: true },
    libelle_lowercase: { type: String, required: true },
    vehicule: { type: String, enum: ["BUS", "TRAM", "BATEAU"], required: true },
    type: {
      type: String,
      enum: ["CLASSIQUE", "DELESTAGE", "AUTRE", "FICTIF"],
      required: true,
    },
    actif: { type: Number, enum: [0, 1] as const, required: true },
  },
  {
    timestamps: true,
  },
);

export type dbTBM_Stops = Omit<InferSchemaType<typeof dbTBM_Stops>, "coords"> & {
  coords: [number, number];
};

export default function (m: typeof model) {
  const modelName = "tbm_stops";
  return m<dbTBM_Stops>(modelName, dbTBM_Stops);
}
