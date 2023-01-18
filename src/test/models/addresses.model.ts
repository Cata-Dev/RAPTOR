// addresses-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { InferSchemaType, Schema, model } from "mongoose";

const dbAddresses = new Schema(
  {
    _id: { type: Number, required: true },
    coords: { type: [Number], required: true },
    numero: { type: Number, required: true },
    rep: { type: String, required: false },
    type_voie: { type: String, required: true },
    nom_voie: { type: String, required: true },
    nom_voie_lowercase: { type: String, required: true },
    code_postal: { type: Number, required: true },
    fantoir: { type: String, required: true },
    commune: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export type dbAddresses = Omit<InferSchemaType<typeof dbAddresses>, "coords"> & {
  coords: [number, number];
};

export default function (m: typeof model) {
  const modelName = "addresses";
  return m<dbAddresses>(modelName, dbAddresses);
}
