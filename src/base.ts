/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Id, IRAPTORData, Journey, JourneyStep, Ordered, Route, Stop } from "./structures";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Time } from "./structures";

interface RAPTORRunSettings {
  walkSpeed: number;
  maxTransferLength: number;
}

/**
 * @description A RAPTOR instance
 * @template TimeVal Time representation internal type, its full type is {@link Time<TimeVal>}.
 */
export default class BaseRAPTOR<
  TimeVal,
  SI extends Id = Id,
  RI extends Id = Id,
  TI extends Id = Id,
  V extends Ordered<V> = never,
  CA extends [V, string][] = [],
> {
  static defaultRounds = 6;

  protected runParams: { settings: RAPTORRunSettings; ps: SI; pt: SI; departureTime: TimeVal; rounds: number } | null = null;

  /** Round k <=> at most k transfers */
  protected k = 0;
  protected marked = new Set<SI>();

  /**
   * @description Creates a new RAPTOR instance for a defined network.
   */
  constructor(protected readonly data: IRAPTORData<TimeVal, SI, RI, TI>) {}

  /**
   * Getter on stops from {@link data}
   */
  get stops() {
    return this.data.stops;
  }

  /**
   * Getter on routes from {@link data}
   */
  get routes() {
    return this.data.routes;
  }

  get time() {
    return this.data.timeType;
  }

  /**
   * @param length Length of the path, in m.
   * @param walkSpeed Walk speed, in m/s
   * @returns Duration in ms
   */
  protected walkDuration(length: number): number {
    return (length / this.runParams!.settings.walkSpeed) * 1_000;
  }

  /**
   * @description Finds the earliest {@link Trip} on route `r` at stop `p` departing after `after`.
   * @param r Route Id.
   * @param p Stop Id.
   * @param after Time after which trips should be considered
   * @param startTripIndex Trip index to start iterating from
   * @returns The earliest {@link Trip} on the route (and its index) `r` at the stop `p`, or `null` if no one is catchable.
   */
  protected et(route: Route<TimeVal, SI, RI>, p: SI, after: TimeVal, startTripIndex = 0): { tripIndex: number; boardedAt: SI } | null {
    for (let t = startTripIndex; t < route.trips.length; t++) {
      // Catchable?
      const tDep = route.departureTime(t, route.stops.indexOf(p));
      if (this.time.order(tDep, this.time.MAX_SAFE) < 0 && this.time.order(tDep, after) >= 0) return { tripIndex: t, boardedAt: p };
    }

    return null;
  }

  protected init() {
    this.marked = new Set<SI>();
    this.k = 0;
    this.marked.add(this.runParams!.ps);
  }

  protected beginRound() {
    throw new Error("Not implemented");
  }

  // Mark improvement
  protected mark(Q: Map<RI, SI>) {
    Q.clear();
    for (const p of this.marked) {
      const connectedRoutes = this.stops.get(p)!.connectedRoutes;

      for (const r of connectedRoutes) {
        const p2 = Q.get(r);
        if (!p2 || this.routes.get(r)!.stops.indexOf(p) < this.routes.get(r)!.stops.indexOf(p2)) Q.set(r, p);
      }

      this.marked.delete(p);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected traverseRoute(route: Route<TimeVal, SI, RI, TI>, stop: SI) {
    throw new Error("Not implemented");
  }

  /**
   * Util method to iterate through transfers and stop when required.
   * It takes advantage of the **sorting** of transfers by ascending transfer length.
   * @param transfers Transfers to iterate
   * @returns An iterator (generator) through transfers
   */
  protected *validFootPaths(transfers: Stop<SI, RI>["transfers"]) {
    for (const transfer of transfers) {
      if (transfer.length > this.runParams!.settings.maxTransferLength) return;

      yield transfer;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected traverseFootPaths(stopId: SI, stop: Stop<SI, RI>) {
    throw new Error("Not implemented");
  }

  run(ps: SI, pt: SI, departureTime: TimeVal, settings: RAPTORRunSettings, rounds: number = BaseRAPTOR.defaultRounds) {
    this.runParams = { ps, pt, departureTime, settings, rounds };

    this.init();
    /** Map<{@link RI} in {@link routes}, {@link SI} in {@link stops}> */
    const Q = new Map<RI, SI>();

    for (this.k = 1; this.k < rounds; this.k++) {
      this.beginRound();

      this.mark(Q);

      // Traverse each route
      for (const [r, p] of Q) this.traverseRoute(this.routes.get(r)!, p);

      // Look at foot-paths
      if (this.k === 1)
        // Mark source so foot paths from it are considered in first round
        this.marked.add(ps);
      // Copy current state of marked stops
      for (const p of new Set(this.marked)) {
        const stop = this.stops.get(p)!;

        if (!stop.transfers.length) continue;

        this.traverseFootPaths(p, stop);
      }

      // Stopping criterion
      if (this.marked.size === 0) break;
    }
  }

  protected traceBackFromStep(from: JourneyStep<TimeVal, SI, RI, V, CA>, initRound: number): Journey<TimeVal, SI, RI, V, CA> {
    if (initRound < 0 || initRound > this.k) throw new Error(`Invalid initRound (${initRound}) provided.`);

    let k = initRound;
    let trace: Journey<TimeVal, SI, RI, V, CA> = [];

    let previousStep: JourneyStep<TimeVal, SI, RI, V, CA> | null = from;
    while (previousStep !== null) {
      trace = ["boardedAt" in previousStep ? { ...previousStep, boardedAt: previousStep.boardedAt[0] } : previousStep, ...trace];

      if (k < 0)
        // Unable to get back to source
        throw new Error(`No journey in initRound ${initRound}.`);

      if (!("boardedAt" in previousStep)) {
        if (this.time.order(previousStep.label.time, this.time.MAX_SAFE) >= 0) {
          k--;
          continue;
        }

        previousStep = null;
      } else {
        previousStep = previousStep.boardedAt[1];

        if (
          trace.find(
            (js) =>
              previousStep &&
              "boardedAt" in previousStep &&
              "boardedAt" in js &&
              js.label.time === previousStep.label.time &&
              js.boardedAt === previousStep.boardedAt[0],
          )
        )
          // This should not happen in production, and would be due to failing data
          throw new Error(`Impossible journey (cyclic).`);
      }
    }

    return trace;
  }
}

export { RAPTORRunSettings };
