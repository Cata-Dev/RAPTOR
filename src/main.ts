import { Stop, Route, stopId, routeId, timestamp, MAX_SAFE_TIMESTAMP, FootPath } from "./Structures";

export type LabelType = "DEFAULT" | "DEPARTURE" | "FOOT" | "VEHICLE";
export type Label<T extends LabelType = LabelType> = T extends "VEHICLE"
  ? {
      /** @param boardedAt {@link stopId} in {@link RAPTOR.stops} */
      boardedAt: stopId;
      /** @param route {@link Route} in {@link RAPTOR.routes} */
      route: Route;
      tripIndex: number;
      time: timestamp; //arrival time
    }
  : T extends "FOOT"
  ? {
      /** @param boardedAt {@link stopId} in {@link RAPTOR.stops} */
      boardedAt: stopId;
      /** @param boardedAt {@link stopId} in {@link RAPTOR.stops} */
      transfer: FootPath;
      time: timestamp;
    }
  : T extends "DEPARTURE"
  ? {
      time: number;
    }
  : T extends "DEFAULT"
  ? { time: typeof MAX_SAFE_TIMESTAMP }
  : never;
export type Journey = Label<"DEPARTURE" | "VEHICLE" | "FOOT">[];

export interface RAPTORRunSettings {
  walkSpeed: number;
}

/**
 * @description A RAPTOR instance
 */
export default class RAPTOR {
  static defaultRounds = 6;

  readonly stops: Map<stopId, Stop>;
  readonly routes: Map<routeId, Route>;

  /** @description A {@link Label} T*(stopId) represents the earliest known arrival time at stop stopId. */
  protected bestLabels = new Map<stopId, Label<LabelType>>();
  /** @description A {@link Label} Ti(stopId) represents the earliest known arrival time at stop stopId with up to i trips. */
  protected multiLabel: (typeof this.bestLabels)[] = [];
  /** Set<{@link stopId} in {@link stops}> */
  protected marked = new Set<stopId>();
  /** Round k <=> at most k transfers */
  protected k = 0;

  /**
   * @description Creates a new RAPTOR instance for a defined network.
   */
  constructor(stops: Stop[], routes: ConstructorParameters<typeof Route>[]) {
    this.stops = new Map(stops.map((s) => [s.id, s]));
    this.routes = new Map(routes.map(([rId, stopsIds, trips]) => [rId, new Route(rId, stopsIds, trips)]));
  }

  /**
   * @param length Length of the path.
   * @param walkSpeed Walk speed, in m/s
   * @returns Duration in ms
   */
  protected walkDuration(length: number, walkSpeed: RAPTORRunSettings["walkSpeed"]): number {
    return (length / walkSpeed) * 1000;
  }

  /**
   * @description Finds the earliest {@link Trip} on the route r at the stop p.
   * @param r Route Id.
   * @param p Stop Id.
   * @param k Current round.
   * @returns The earliest {@link Trip} on the route (and its index) r at the stop p, or null if no one is catchable.
   */
  protected et(route: Route, p: stopId): { tripIndex: number; boardedAt: stopId } | null {
    for (let t = 0; t < route.trips.length; t++) {
      //Catchable
      const tDep = route.departureTime(t, p);
      if (tDep < MAX_SAFE_TIMESTAMP && tDep >= (this.multiLabel[this.k - 1].get(p)?.time ?? Infinity)) return { tripIndex: t, boardedAt: p };
    }
    return null;
  }

  protected footPathsLookup(walkSpeed: RAPTORRunSettings["walkSpeed"]) {
    //Copy current state of marked stops
    for (const p of new Set(this.marked)) {
      const stop = this.stops.get(p);
      if (stop === undefined) continue;

      for (const transfer of stop.transfers) {
        if (transfer.to === p) continue;

        // Prevent cyclic labels
        const trace = this.traceBack(p, this.k);
        if (trace.find((label) => "boardedAt" in label && label.boardedAt === transfer.to)) continue;

        const arrivalTime: timestamp = (this.multiLabel[this.k].get(p)?.time ?? Infinity) + this.walkDuration(transfer.length, walkSpeed);
        if (arrivalTime < (this.multiLabel[this.k].get(transfer.to)?.time ?? Infinity)) {
          this.multiLabel[this.k].set(transfer.to, { boardedAt: p, transfer, time: arrivalTime });

          this.marked.add(transfer.to);
        }
      }
    }
  }

  /**
   * @description Main RAPTOR algorithm function.
   * @param ps {@link stopId} in {@link stops}.
   * @param pt {@link stopId} in {@link stops}.
   * @param Depature time.
   * @param rounds Maximal number of transfers
   */
  run(ps: stopId, pt: stopId, departureTime: timestamp, settings: RAPTORRunSettings, rounds: number = RAPTOR.defaultRounds) {
    //Re-initialization
    this.multiLabel = Array.from({ length: rounds }, () => new Map<stopId, Label<LabelType>>());
    this.bestLabels = new Map();
    this.marked = new Set<stopId>();
    this.k = 0;

    //Initialization
    for (const stopId of this.stops.keys()) {
      for (let k = 0; k < rounds; k++) {
        this.multiLabel[k].set(stopId, { time: Infinity });
      }

      this.bestLabels.set(stopId, { time: Infinity });
    }
    this.multiLabel[this.k].set(ps, { time: departureTime });
    this.marked.add(ps);

    //Preliminary foot-paths lookup to join stops close to ps => use them in first round as fake departure stops
    this.footPathsLookup(settings.walkSpeed);

    /** Map<{@link routeId} in {@link routes}, {@link stopId} in {@link stops}> */
    const Q = new Map<routeId, stopId>();

    //Step 1
    //Mark improvement
    for (this.k = 1; this.k < rounds; this.k++) {
      Q.clear();
      for (const p of this.marked) {
        const connectedRoutes: routeId[] = this.stops.get(p)?.connectedRoutes ?? [];

        for (const r of connectedRoutes) {
          const p2 = Q.get(r);
          if (!p2 || (this.routes.get(r)?.stops ?? []).indexOf(p) < (this.routes.get(r)?.stops ?? []).indexOf(p2)) Q.set(r, p);
        }

        this.marked.delete(p);
      }

      //Traverse each route
      for (const [r, p] of Q) {
        let t: ReturnType<typeof this.et> | null = null;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const route: Route = this.routes.get(r)!;

        for (let i = route.stops.indexOf(p); i < route.stops.length; i++) {
          const pi = route.stops[i];

          //Improve periods, local & target pruning
          if (t !== null) {
            const arrivalTime: timestamp = route.trips[t.tripIndex].times[i][0];
            if (arrivalTime < Math.min(this.bestLabels.get(pi)?.time ?? Infinity, this.bestLabels.get(pt)?.time ?? Infinity)) {
              //local & target pruning
              this.multiLabel[this.k].set(pi, { ...t, route, time: arrivalTime });
              this.bestLabels.set(pi, { ...t, route, time: arrivalTime });
              this.marked.add(pi);
            }
          }

          if (!t) t = this.et(route, pi);
          //Catch an earlier trip at pi ?
          else if ((this.multiLabel[this.k - 1].get(pi)?.time ?? Infinity) <= route.departureTime(t.tripIndex, pi)) {
            const newEt = this.et(route, pi);
            if (t.tripIndex !== newEt?.tripIndex) {
              t = newEt;
            }
          }
        }
      }

      //Look at foot-paths
      this.footPathsLookup(settings.walkSpeed);

      //Stopping criterion
      if (this.marked.size === 0) break;
    }
  }

  protected traceBack(from: stopId, initRound: number): Journey {
    if (initRound < 1 || initRound > this.multiLabel.length) throw new Error(`Invalid round (${initRound}) provided.`);

    let k = initRound;
    let trace: Journey = [];

    let previousStop: stopId | null = from;
    while (previousStop !== null) {
      if (k < 0) throw new Error(`No journey in round ${initRound}.`); // Unable to get back to source

      const previousLabel = this.multiLabel[k].get(previousStop);
      if (!previousLabel) throw new Error(`Invalid stop ${previousStop}.`); // Should never get here, unless invalid "from" stop

      if (!("boardedAt" in previousLabel)) {
        if (previousLabel.time >= MAX_SAFE_TIMESTAMP) {
          k--;
          continue;
        }

        previousStop = null;
      } else {
        if (trace.find((j) => "boardedAt" in j && j.boardedAt === previousLabel.boardedAt && j.time === previousLabel.time))
          throw new Error(`Impossible journey (cyclic).`);

        previousStop = previousLabel.boardedAt;
      }

      trace = [previousLabel, ...trace];
    }

    return trace;
  }

  getBestJourneys(pt: stopId): (null | Journey)[] {
    const journeys: (null | Journey)[] = Array.from({ length: this.multiLabel.length }, () => null);

    for (let k = 1; k < journeys.length; k++) {
      try {
        journeys[k] = this.traceBack(pt, k);
      } catch (_) {}
    }

    return journeys;
  }
}
