import { Stop, Route, timestamp, FootPath, Id, RAPTORData, ArrayRead, MapRead } from "./Structures";

export type LabelType = "DEFAULT" | "DEPARTURE" | "FOOT" | "VEHICLE";
export type Label<SI extends Id, RI extends Id, T extends LabelType = LabelType> = T extends "VEHICLE"
  ? {
      /** @param boardedAt {@link SI} in {@link RAPTOR.stops} */
      boardedAt: SI;
      /** @param route {@link Route} in {@link RAPTOR.routes} */
      route: Route<SI, RI>;
      tripIndex: number;
      time: timestamp; // Arrival time
    }
  : T extends "FOOT"
    ? {
        /** @param boardedAt {@link SI} in {@link RAPTOR.stops} */
        boardedAt: SI;
        /** @param boardedAt {@link SI} in {@link RAPTOR.stops} */
        transfer: FootPath<SI>;
        time: timestamp;
      }
    : T extends "DEPARTURE"
      ? {
          time: number;
        }
      : T extends "DEFAULT"
        ? { time: InstanceType<typeof RAPTORData>["MAX_SAFE_TIMESTAMP"] }
        : never;
export type Journey<RI extends Id, SI extends Id> = Label<RI, SI, "DEPARTURE" | "VEHICLE" | "FOOT">[];

export interface RAPTORRunSettings {
  walkSpeed: number;
}

/**
 * @description A RAPTOR instance
 */
export default class RAPTOR<SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> {
  static defaultRounds = 6;

  readonly stops: MapRead<SI, Stop<SI, RI>>;
  readonly routes: MapRead<RI, Route<SI, RI, TI>>;

  protected readonly MAX_SAFE_TIMESTAMP: number;
  /** @description A {@link Label} Ti(SI) represents the earliest known arrival time at stop SI with up to i trips. */
  protected multiLabel: Map<SI, Label<SI, RI>>[] = [];
  /** Set<{@link SI} in {@link stops}> */
  protected marked = new Set<SI>();
  /** Round k <=> at most k transfers */
  protected k = 0;

  /**
   * @description Creates a new RAPTOR instance for a defined network.
   */
  constructor(data: RAPTORData<SI, RI, TI>) {
    this.stops = data.stops;
    this.routes = data.routes;
    this.MAX_SAFE_TIMESTAMP = data.MAX_SAFE_TIMESTAMP;
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
  protected et(route: Route<SI, RI>, p: SI): { tripIndex: number; boardedAt: SI } | null {
    for (let t = 0; t < route.trips.length; t++) {
      // Catchable
      const tDep = route.departureTime(t, p);
      if (tDep < this.MAX_SAFE_TIMESTAMP && tDep >= (this.multiLabel[this.k - 1].get(p)?.time ?? Infinity)) return { tripIndex: t, boardedAt: p };
    }
    return null;
  }

  protected footPathsLookup(walkSpeed: RAPTORRunSettings["walkSpeed"]) {
    // Copy current state of marked stops
    for (const p of new Set(this.marked)) {
      const stop = this.stops.get(p);
      if (stop === undefined) continue;

      for (const transfer of stop.transfers) {
        if (transfer.to === p) continue;

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
   * @param ps {@link SI} in {@link stops}.
   * @param pt {@link SI} in {@link stops}.
   * @param departureTime Departure time.
   * @param rounds Maximal number of transfers.
   */
  run(ps: SI, pt: SI, departureTime: timestamp, settings: RAPTORRunSettings, rounds: number = RAPTOR.defaultRounds) {
    //Re-initialization
    this.multiLabel = Array.from({ length: rounds }, () => new Map<SI, Label<SI, RI>>());
    this.marked = new Set<SI>();
    this.k = 0;

    // Initialization
    for (const [stopId] of this.stops) {
      this.multiLabel[this.k].set(stopId, { time: Infinity });
    }
    this.multiLabel[this.k].set(ps, { time: departureTime });
    this.marked.add(ps);

    // Preliminary foot-paths lookup to join stops close to ps => use them in first round as fake departure stops
    this.footPathsLookup(settings.walkSpeed);

    /** Map<{@link RI} in {@link routes}, {@link SI} in {@link stops}> */
    const Q = new Map<RI, SI>();

    for (this.k = 1; this.k < rounds; this.k++) {
      // Copying
      for (const [stopId] of this.stops) {
        const value = this.multiLabel[this.k - 1].get(stopId);
        this.multiLabel[this.k].set(stopId, value ? structuredClone(value) : { time: Infinity });
      }

      // Mark improvement
      Q.clear();
      for (const p of this.marked) {
        const connectedRoutes = (this.stops.get(p)?.connectedRoutes ?? ([] as RI[])) satisfies ArrayRead<RI>;

        for (const r of connectedRoutes) {
          const p2 = Q.get(r);
          if (
            !p2 ||
            (this.routes.get(r)?.stops ?? ([] as ArrayRead<SI>)).indexOf(p) < (this.routes.get(r)?.stops ?? ([] as ArrayRead<SI>)).indexOf(p2)
          )
            Q.set(r, p);
        }

        this.marked.delete(p);
      }

      // Traverse each route
      for (const [r, p] of Q) {
        let t: ReturnType<typeof this.et> | null = null;

        const route: Route<SI, RI> = this.routes.get(r)!;

        for (let i = route.stops.indexOf(p); i < route.stops.length; i++) {
          const pi = route.stops[i];

          // Improve periods, local & target pruning
          if (t !== null) {
            const arrivalTime: timestamp = route.trips[t.tripIndex].times[i][0];
            if (arrivalTime < Math.min(this.multiLabel[this.k].get(pi)?.time ?? Infinity, this.multiLabel[this.k].get(pt)?.time ?? Infinity)) {
              // local & target pruning
              this.multiLabel[this.k].set(pi, { ...t, route, time: arrivalTime });
              this.marked.add(pi);
            }
          }

          if (!t) t = this.et(route, pi);
          // Catch an earlier trip at pi ?
          else if ((this.multiLabel[this.k - 1].get(pi)?.time ?? Infinity) <= route.departureTime(t.tripIndex, pi)) {
            const newEt = this.et(route, pi);
            if (t.tripIndex !== newEt?.tripIndex) {
              t = newEt;
            }
          }
        }
      }

      // Look at foot-paths
      this.footPathsLookup(settings.walkSpeed);

      // Stopping criterion
      if (this.marked.size === 0) break;
    }
  }

  protected traceBack(from: SI, initRound: number): Journey<SI, RI> {
    if (initRound < 1 || initRound > this.multiLabel.length) throw new Error(`Invalid round (${initRound}) provided.`);

    let k = initRound;
    let trace: Journey<SI, RI> = [];

    let previousStop: SI | null = from;
    while (previousStop !== null) {
      if (k < 0) throw new Error(`No journey in round ${initRound}.`); // Unable to get back to source

      const previousLabel = this.multiLabel[k].get(previousStop);
      if (!previousLabel) throw new Error(`Invalid stop ${previousStop}.`); // Should never get here, unless invalid "from" stop

      if (!("boardedAt" in previousLabel)) {
        if (previousLabel.time >= this.MAX_SAFE_TIMESTAMP) {
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

  getBestJourneys(pt: SI): (null | Journey<SI, RI>)[] {
    const journeys: (null | Journey<SI, RI>)[] = Array.from({ length: this.multiLabel.length }, () => null);

    for (let k = 1; k < journeys.length; k++) {
      try {
        journeys[k] = this.traceBack(pt, k);
      } catch {
        /* empty */
      }
    }

    return journeys;
  }
}
