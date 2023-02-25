import { run } from "./test";
import { benchmark } from "./utils/benchmark";

benchmark(run, [{ getFullPaths: false, computeGEOJSONs: false }], 5)
  .then(console.log)
  .catch(console.error);
