// intersections-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { InferSchemaType, Schema, model } from "mongoose";

const dbIntersections = new Schema(
  {
    coords: { type: [Number], required: true },
    _id: { type: Number, required: true },
    nature: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export type dbIntersections = InferSchemaType<typeof dbIntersections>;

export default function (m: typeof model) {
  const modelName = "intersections";
  return m(modelName, dbIntersections);
}
