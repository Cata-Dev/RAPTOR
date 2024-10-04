import { run } from "./test";
import { benchmark } from "../utils/benchmark";

const args = process.argv.slice(2);
const getFullPaths = JSON.parse(args[0]) as boolean;
const computeGEOJSONs = JSON.parse(args[1]) as boolean;
const times = JSON.parse(args[2]) as number;

if (typeof getFullPaths !== "boolean") throw new Error(`Type of argument 1 "getFullPaths" invalid (got ${typeof getFullPaths})`);
if (typeof computeGEOJSONs !== "boolean") throw new Error(`Type of argument 2 "computeGEOJSONs" invalid (got ${typeof getFullPaths})`);
if (typeof times !== "number") throw new Error(`Type of argument 3 "times" invalid (got ${typeof times})`);

benchmark(run, [{ getFullPaths, computeGEOJSONs, dijkstraOptions: { maxCumulWeight: 5_000 } }], this, times)
  .then()
  .catch(console.error);
