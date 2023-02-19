import { connect } from "mongoose";

export default async function () {
  const client = await connect(
    `mongodb://0.0.0.0:27017/bibm`,
    //{ useNewUrlParser: true }
  );

  console.info("Database connected.");

  return client;
}
