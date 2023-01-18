// tbm_schedules-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { InferSchemaType, Schema, model } from "mongoose";

const dbTBM_Schedules = new Schema(
  {
    _id: { type: Number, required: true },
    hor_theo: { type: Date, required: true },
    hor_app: { type: Date, required: true },
    hor_estime: { type: Date, required: true },
    etat: {
      type: String,
      enum: ["NON_REALISE", "REALISE", "DEVIE"],
      required: true,
    },
    type: { type: String, enum: ["REGULIER"], required: true }, //donnée incertaine
    rs_sv_arret_p: { type: Number, required: true, ref: "stops" },
    rs_sv_cours_a: { type: Number, required: true, ref: "vehicles" },
  },
  {
    timestamps: true,
  },
);

export type dbTBM_Schedules = InferSchemaType<typeof dbTBM_Schedules>;

export default function (m: typeof model) {
  const modelName = "tbm_schedules";
  return m(modelName, dbTBM_Schedules);
}
