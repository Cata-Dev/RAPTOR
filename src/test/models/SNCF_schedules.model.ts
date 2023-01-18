// sncf_schedules-model.js - A mongoose model
//
// See http://mongoosejs.com/docs/models.html

import { InferSchemaType, Schema, model } from "mongoose";

const dbSNCF_Schedules = new Schema(
  {
    _id: { type: String, required: true },
    realtime: { type: Date, required: true },
    trip: { type: Number, required: true }, //implicitly includes direction
    stop_point: { type: Number, required: true, ref: "sncf_stops" },
    route: { type: String, required: true, ref: "sncf_routes" },
  },
  {
    timestamps: true,
  },
);

export type dbSNCF_Schedules = InferSchemaType<typeof dbSNCF_Schedules>;

export default function (m: typeof model) {
  const modelName = "sncf_route_schedules";
  return m(modelName, dbSNCF_Schedules);
}
