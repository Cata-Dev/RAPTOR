import { createConnection } from "mongoose";

export default async function (dbName: string) {
  const connection = createConnection(`mongodb://0.0.0.0:27017/${dbName}`);

  await connection.asPromise();

  console.info(`Database ${dbName} connected.`);

  return connection;
}
