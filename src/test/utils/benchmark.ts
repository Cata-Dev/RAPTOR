/**
 * Benchmark a function
 * @param f The function to do the benchmark on, sync or async
 * @param args The argument(s) to pass to the function {@link f}
 * @param thisArg A custom "this" to pass to the function {@link f}
 * @param times Number of times to repeat the benchmark
 * @param logStats Whether to log to the bench to the console at its end, or not
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function benchmark<F extends (...args: any[]) => any>(
  this: unknown,
  f: F,
  args: Parameters<F>,
  thisArg: unknown = this, // TODO : deeper look on thisArg + ThisType
  times = 1,
  logStats = true,
) {
  const starts = new Array<number>(times);
  const ends = new Array<number>(times);
  let lastReturn: Awaited<ReturnType<F>> | null = null;
  for (let i = 0; i < times; i++) {
    starts[i] = performance.now();
    lastReturn = (await f.call(thisArg, ...args)) as Awaited<ReturnType<F>>;
    ends[i] = performance.now();
  }
  const durations = ends.map((e, i) => new Duration(e - starts[i]));
  const totalDuration = new Duration(durations.reduce((acc, v) => acc + v.ms, 0));
  const averageDuration = new Duration(totalDuration.ms / times);
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  if (logStats) console.log(`Benchmark of ${f.name || "anonymous"}: ${averageDuration}`);
  return {
    fName: f.name,
    args,
    starts,
    ends,
    durations,
    totalDuration,
    averageDuration,
    times,
    lastReturn,
  };
}

export class Duration {
  private time: number;

  static getLeadingZeros(time: number, expectedNumbers: number) {
    const repeats = expectedNumbers - time.toString().length;
    return "0".repeat(repeats < 0 ? 0 : repeats);
  }

  constructor(ms: number) {
    this.time = ms;
  }

  get ms() {
    return this.time;
  }

  set ms(ms: number) {
    this.time = ms;
  }

  get rMs() {
    return this.time % 1000;
  }

  get totalSeconds() {
    return Math.floor(this.time / 1000);
  }

  get rSeconds() {
    return Math.floor(this.rMinuts / 1000);
  }

  get totalMinuts() {
    return Math.floor(this.time / 60000);
  }

  get rMinuts() {
    return this.time % 60000;
  }

  toString() {
    return `${Duration.getLeadingZeros(this.totalMinuts, 2)}${this.totalMinuts}:${Duration.getLeadingZeros(this.rSeconds, 2)}${
      this.rSeconds
    }:${Duration.getLeadingZeros(Math.floor(this.rMs), 3)}${this.rMs}`;
  }
}
