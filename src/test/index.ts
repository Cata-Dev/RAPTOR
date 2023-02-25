import { run } from "./test";
import { benchmark } from "./utils/benchmark";

benchmark(run, [], 10).then(console.log).catch(console.error);