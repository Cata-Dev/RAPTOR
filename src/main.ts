import { Stop, Trip, Route, stopId, routeId, footPaths, timestamp } from "./utils/Structures";

/**
 * @description A RAPTOR instance
 */
export default class RAPTOR {
  static defaultRounds = 6;

  readonly stops: Array<Stop>;
  readonly routes: Array<Route>;

  /**
   * @description Creates a new RAPTOR instance for a defined network.
   */
  constructor(stops: Array<[number, number, routeId[], footPaths, any]>, routes: Array<[stopId[], Trip[]]>) {
    this.stops = stops.map((s) => (s instanceof Stop ? s : new Stop(...s)));
    this.routes = routes.map((r) => (r instanceof Route ? r : new Route(...r)));

    // Added for ts mental health
    this.periodsRoundsStops = [];
    this.periodsStops = [];
  }

  stop(s: stopId): Stop {
    return this.stops[s];
  }

  route(r: routeId): Route {
    return this.routes[r];
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
   * @param r Route index.
   * @param p Stop index.
   * @param k Current round.
   * @returns The earliest {@link Trip} on the route (and its index) r at the stop p, or null if no one is catchable.
   */
  et(r: routeId, p: stopId, k: number): [Trip, number] | null {
    let earliestTrip: Trip | null = null;
    let n: number | null = null;
    const route: Route = this.routes[r];
    for (let t: number = 0; t < route.trips.length; t++) {
      //Catchable
      if (route.departureTime(t, p) >= this.periodsRoundsStops[p][k - 1]) (earliestTrip = route.trips[t]), (n = t);
    }
    return typeof n === "number" && !isNaN(n) && earliestTrip instanceof Trip ? [earliestTrip, n] : null;
  }

  /**
   * @description Finds the earliest defined {@link Trip} on the route r at the stop p.
   * @param r Route index.
   * @param k Current round.
   * @returns The earliest defined {@link Trip} on the route (and its index) r at the stop p, or null if no one is catchable.
   */
  findCurrentTrip(r: routeId, k: number): [Trip, number] | null {
    let trip = null;
    for (const pi of this.routes[r].stops) {
      trip = this.et(r, pi, k);
      if (trip) break;
    }
    return trip;
  }

  protected periodsRoundsStops: Array<Array<timestamp>>;
  protected periodsStops: Array<timestamp>;

  /**
   * @description Main RAPTOR algorithm function.
   * @param ps Index of the source {@link Stop} in provided Stops.
   * @param pt Index of the pt {@link Stop} in provided Stops.
   * @param Depature time.
   * @param rounds Maximal number of transfers
   */
  run(ps: stopId, pt: stopId, departureTime: timestamp, settings: { walkSpeed: number }, rounds: number = RAPTOR.defaultRounds) {
    this.periodsRoundsStops = new Array(rounds).map(() => new Array(this.stops.length));
    this.periodsStops = new Array(this.stops.length);

    const Marked: Set<stopId> = new Set();

    //Initialization
    for (let Sn = 0; Sn < this.stops.length; Sn++) {
      for (let k = 0; k < rounds; k++) {
        this.periodsRoundsStops[Sn][k] = Infinity;
      }

      this.periodsStops[Sn] = Infinity;
    }

    this.periodsRoundsStops[ps][0] = departureTime;
    Marked.add(ps);

    const Q: Map<routeId, stopId> = new Map();

    //Step 1
    //Mark improvement
    for (let k = 1; k <= rounds; k++) {
      Q.clear();
      for (const p of Marked) {
        const connectedRoutes: routeId[] = this.stops[p].connectedRoutes;

        for (const r of connectedRoutes) {
          const p2 = Q.get(r);
          if (p2) {
            if (this.route(r).stops.indexOf(p) < this.route(r).stops.indexOf(p2)) Q.set(r, p);
          } else Q.set(r, p);
        }

        Marked.delete(p);
      }

      //Traverse each route
      for (const [r, p] of Q) {
        let t: [Trip, number] | null = this.et(r, p, k);

        const route: Route = this.route(r);

        for (const pi of route.stops.slice(route.stops.indexOf(p))) {
          //pi: stopId

          //Improve periods, local & target pruning
          if (t !== null) {
            const arrivalTime: timestamp = t[0].stopTimes[pi];

            if (arrivalTime < Math.min(this.periodsStops[pi], this.periodsStops[pt])) {
              //local & target pruning

              this.periodsRoundsStops[k][pi] = arrivalTime;
              this.periodsStops[pi] = arrivalTime;
              Marked.add(pi);
            }
          }

          //Catch an earlier trip at pi ?
          t = this.et(r, pi, k) ?? t;
        }
      }

      //Look at foot-paths
      for (const p of Q.values()) {
        const stop: Stop = this.stop(p);

        // Added for ts mental health
        const transfers = stop.transfers.get(p);
        if (!transfers) continue;

        for (const p2 of transfers) {
          const arrivalTime: timestamp = this.periodsRoundsStops[k][p] + this.walkDuration(p2.length, settings.walkSpeed);

          if (arrivalTime < this.periodsRoundsStops[k][2]) this.periodsRoundsStops[k][p2.to] = arrivalTime;
          Marked.add(p2.to);
        }
      }

      //Stopping criterion
      if (Q.size === 0) break;
    }
  }
}
