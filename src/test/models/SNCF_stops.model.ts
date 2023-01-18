// sncf_stops-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { InferSchemaType, Schema, model } from "mongoose";

const dbSNCF_Stops = new Schema(
  {
    _id: { type: Number, required: true },
    coords: { type: [Number], required: true },
    name: { type: String, required: true },
    name_lowercase: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export type dbSNCF_Stops = Omit<InferSchemaType<typeof dbSNCF_Stops>, "coords"> & {
  coords: [number, number];
};

export default function (m: typeof model) {
  const modelName = "sncf_stops";
  return m<dbSNCF_Stops>(modelName, dbSNCF_Stops);
}
