import { Stop, Trip, Route, stopId, routeId, footPaths, timestamp } from "./utils/Structures";

export type LabelType = "DEFAULT" | "FIRST" | "TRANSFER" | "FULL";
export type Label<T extends LabelType> = T extends "FULL"
  ? {
      /** @param boardedAt {@link stopId} in {@link RAPTOR.stops} */
      boardedAt: stopId;
      /** @param route {@link Route} in {@link RAPTOR.routes} */
      route: Route;
      tripIndex: number;
      time: timestamp; //arrival time
    }
  : T extends "TRANSFER"
  ? {
      /** @param boardedAt {@link stopId} in {@link RAPTOR.stops} */
      boardedAt: stopId;
      /** @param boardedAt {@link stopId} in {@link RAPTOR.stops} */
      transferId: stopId;
      time: timestamp;
    }
  : T extends "FIRST"
  ? {
      time: timestamp;
    }
  : T extends "DEFAULT"
  ? { time: number }
  : never;

/**
 * @description A RAPTOR instance
 */
export default class RAPTOR {
  static defaultRounds = 6;

  readonly stops: Map<stopId, Stop>;
  readonly routes: Map<routeId, Route>;

  protected bestLabels: Map<stopId, Label<LabelType>> = new Map();
  /** @description A {@link Label} Ti(stopId) represents the earliest known arrival time at stop stopId with up to i trips. */
  protected multiLabel: Array<typeof this.bestLabels> = [];

  /**
   * @description Creates a new RAPTOR instance for a defined network.
   */
  constructor(stops: Array<[stopId, number, number, routeId[], footPaths]>, routes: Array<[routeId, [stopId[], Trip[]]]>) {
    this.stops = new Map(stops.map(([id, lat, long, connectedRoutes, transfers]) => [id, { id, lat, long, connectedRoutes, transfers }]));
    this.routes = new Map(routes.map(([rId, r]) => [rId, new Route(rId, ...r)]));
  }

  /**
   * @param length Length of the path.
   * @param walkSpeed Walk speed, in ms/km
   */
  walkDuration(length: number, walkSpeed: number): number {
    return length * walkSpeed;
  }

  /**
   * @description Finds the earliest {@link Trip} on the route r at the stop p.
   * @param r Route Id.
   * @param p Stop Id.
   * @param k Current round.
   * @returns The earliest {@link Trip} on the route (and its index) r at the stop p, or null if no one is catchable.
   */
  et(r: routeId, p: stopId, k: number): [Trip, number] | null {
    const route = this.routes.get(r);

    if (route === undefined) return null;

    for (let t: number = 0; t < route.trips.length; t++) {
      //Catchable
      if (route.departureTime(t, p) >= (this.multiLabel[k - 1].get(p)?.time ?? Infinity)) return [route.trips[t], t];
    }
    return null;
  }

  /**
   * @description Main RAPTOR algorithm function.
   * @param ps {@link stopId} in {@link stops}.
   * @param pt {@link stopId} in {@link stops}.
   * @param Depature time.
   * @param rounds Maximal number of transfers
   */
  run(ps: stopId, pt: stopId, departureTime: timestamp, settings: { walkSpeed: number }, rounds: number = RAPTOR.defaultRounds) {
    this.multiLabel = new Array(rounds).map(() => new Map());
    this.bestLabels = new Map();

    /** Set<{@link stopId} in {@link stops}> */
    const Marked: Set<stopId> = new Set();

    //Initialization
    for (const stopId of this.stops.keys()) {
      for (let k = 0; k < rounds; k++) {
        this.multiLabel[k].set(stopId, { time: Infinity });
      }

      this.bestLabels.set(stopId, { time: Infinity });
    }

    this.multiLabel[0].set(ps, { time: departureTime });
    Marked.add(ps);

    /** Map<{@link routeId} in {@link routes}, {@link stopId} in {@link stops}> */
    const Q: Map<routeId, stopId> = new Map();

    //Step 1
    //Mark improvement
    for (let k = 1; k < rounds; k++) {
      Q.clear();
      for (const p of Marked) {
        const connectedRoutes: routeId[] = this.stops.get(p)?.connectedRoutes ?? [];

        for (const r of connectedRoutes) {
          const p2 = Q.get(r);
          if (p2) {
            if (this.routes.get(r)!.stops.indexOf(p) < this.routes.get(r)!.stops.indexOf(p2)) Q.set(r, p);
          } else Q.set(r, p);
        }

        Marked.delete(p);
      }

      //Traverse each route
      for (const [r, p] of Q) {
        let t: [Trip, number] | null = this.et(r, p, k);

        const route: Route = this.routes.get(r)!;

        for (let i = route.stops.indexOf(p); i < route.stops.length; i++) {
          const pi = route.stops[i];

          //Improve periods, local & target pruning
          if (t !== null) {
            const arrivalTime: timestamp = t[0].times[i][0];

            if (arrivalTime < Math.min(this.bestLabels.get(pi)?.time ?? Infinity, this.bestLabels.get(pt)?.time ?? Infinity)) {
              //local & target pruning
              this.multiLabel[k].set(pi, { boardedAt: p, route, tripIndex: t[1], time: arrivalTime });
              this.bestLabels.set(pi, { boardedAt: p, route, tripIndex: t[1], time: arrivalTime });
              Marked.add(pi);
            }
          }

          //Catch an earlier trip at pi ?
          t = this.et(r, pi, k) ?? t;
        }
      }

      //Look at foot-paths
      for (const p of Q.values()) {
        const stop = this.stops.get(p);
        if (stop === undefined) continue;

        // Added for ts mental health
        const transfers = stop.transfers.get(p);
        if (transfers === undefined) continue;

        for (const transfer of transfers) {
          const arrivalTime: timestamp = (this.multiLabel[k].get(p)?.time ?? Infinity) + this.walkDuration(transfer.length, settings.walkSpeed);

          if (arrivalTime < (this.multiLabel[k].get(transfer.to)?.time ?? Infinity))
            this.multiLabel[k].set(transfer.to, { boardedAt: p, transferId: p, time: arrivalTime });
          Marked.add(transfer.to);
        }
      }

      //Stopping criterion
      if (Q.size === 0) break;
    }
  }
}
