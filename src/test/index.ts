import { run } from "./test";
import { benchmark } from "./utils/benchmark";

benchmark(run, [{ getFullPaths: true, computeGEOJSONs: true, dijkstraOptions: { maxCumulWeight: 5_000 } }], 1)
  .then(console.log)
  .catch(console.error);
