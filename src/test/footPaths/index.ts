import { run } from "./test";
import { benchmark } from "./utils/benchmark";

const args = process.argv.slice(2);
const getFullPaths = JSON.parse(args[0]);
const times = JSON.parse(args[1]);

if (typeof getFullPaths !== "boolean") throw new Error(`Type of argument 1 "getFullPaths" invalid (got ${typeof getFullPaths})`);
if (typeof times !== "number") throw new Error(`Type of argument 2 "times" invalid (got ${typeof times})`);

benchmark(run, [{ getFullPaths, dijkstraOptions: { maxCumulWeight: 5_000 } }], this, times)
  .then(console.log)
  .catch(console.error);
