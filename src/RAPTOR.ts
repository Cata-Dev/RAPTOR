/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BaseRAPTOR, { RAPTORRunSettings } from "./base";
import { Id, Journey, JourneyStep, Label, makeJSComparable, Route, timestamp } from "./structures";

/**
 * @description A RAPTOR instance
 */
export default class RAPTOR<SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> extends BaseRAPTOR<SI, RI, TI> {
  static defaultRounds = 6;

  /** @description A {@link Label} Ti(SI) represents the earliest known arrival time at stop SI with up to i trips. */
  protected multiLabel: Map<SI, JourneyStep<SI, RI, []>>[] = [];
  /** Set<{@link SI} in {@link stops}> */
  protected marked = new Set<SI>();

  /**
   * @description Finds the earliest {@link Trip} on the route r at the stop p.
   * @param r Route Id.
   * @param p Stop Id.
   * @returns The earliest {@link Trip} on the route (and its index) r at the stop p, or null if no one is catchable.
   */
  protected et(route: Route<SI, RI>, p: SI): { tripIndex: number; boardedAt: SI } | null {
    for (let t = 0; t < route.trips.length; t++) {
      // Catchable
      const tDep = route.departureTime(t, route.stops.indexOf(p));
      if (tDep < this.MAX_SAFE_TIMESTAMP && tDep >= (this.multiLabel[this.k - 1].get(p)?.label.time ?? Infinity))
        return { tripIndex: t, boardedAt: p };
    }
    return null;
  }

  protected footPathsLookup(walkSpeed: RAPTORRunSettings["walkSpeed"]) {
    // Copy current state of marked stops
    for (const p of new Set(this.marked)) {
      const stop = this.stops.get(p)!;

      for (const transfer of stop.transfers) {
        if (transfer.to === p) continue;

        const pJourneyStep = this.multiLabel[this.k].get(p)!;
        const arrivalTime: timestamp = pJourneyStep.label.time + this.walkDuration(transfer.length, walkSpeed);
        if (arrivalTime < this.multiLabel[this.k].get(transfer.to)!.label.time) {
          this.multiLabel[this.k].set(
            transfer.to,
            makeJSComparable<SI, RI, [], "FOOT">({ boardedAt: [p, pJourneyStep], transfer, label: new Label([], arrivalTime) }),
          );

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
    this.multiLabel = Array.from({ length: rounds }, () => new Map<SI, JourneyStep<SI, RI, []>>());
    this.marked = new Set<SI>();
    this.k = 0;

    // Initialization
    for (const [stopId] of this.stops) {
      this.multiLabel[this.k].set(stopId, makeJSComparable({ label: new Label([], Infinity) }));
    }
    this.multiLabel[this.k].set(ps, makeJSComparable({ label: new Label([], departureTime) }));
    this.marked.add(ps);

    /** Map<{@link RI} in {@link routes}, {@link SI} in {@link stops}> */
    const Q = new Map<RI, SI>();

    for (this.k = 1; this.k < rounds; this.k++) {
      // Copying
      for (const [stopId] of this.stops) {
        const value = this.multiLabel[this.k - 1].get(stopId)!;
        this.multiLabel[this.k].set(stopId, value);
      }

      // Mark improvement
      Q.clear();
      for (const p of this.marked) {
        const connectedRoutes = this.stops.get(p)!.connectedRoutes;

        for (const r of connectedRoutes) {
          const p2 = Q.get(r);
          if (!p2 || this.routes.get(r)!.stops.indexOf(p) < this.routes.get(r)!.stops.indexOf(p2)) Q.set(r, p);
        }

        this.marked.delete(p);
      }

      // Traverse each route
      for (const [r, p] of Q) {
        let t: ReturnType<typeof this.et> | null = null;

        const route: Route<SI, RI> = this.routes.get(r)!;

        for (let i = route.stops.indexOf(p); i < route.stops.length; i++) {
          const pi = route.stops.at(i)!;

          // Improve periods, local & target pruning
          if (t !== null) {
            const arrivalTime: timestamp = route.trips.at(t.tripIndex)!.times.at(i)![0];
            if (
              arrivalTime < Math.min(this.multiLabel[this.k].get(pi)?.label.time ?? Infinity, this.multiLabel[this.k].get(pt)?.label.time ?? Infinity)
            ) {
              // local & target pruning
              this.multiLabel[this.k].set(
                pi,
                makeJSComparable<SI, RI, [], "VEHICLE">({
                  boardedAt: [t.boardedAt, this.multiLabel[this.k].get(t.boardedAt)!],
                  route,
                  tripIndex: t.tripIndex,
                  label: new Label([], arrivalTime),
                }),
              );
              this.marked.add(pi);
            }
          }

          if (!t) t = this.et(route, pi);
          // Catch an earlier trip at pi ?
          else if ((this.multiLabel[this.k - 1].get(pi)?.label.time ?? Infinity) <= route.departureTime(t.tripIndex, i)) {
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

  protected traceBackFromStep(from: JourneyStep<SI, RI, []>, initRound: number): Journey<SI, RI, []> {
    if (initRound < 0 || initRound > this.multiLabel.length) throw new Error(`Invalid initRound (${initRound}) provided.`);

    let k = initRound;
    let trace: Journey<SI, RI, []> = [];

    let previousStep: JourneyStep<SI, RI, []> | null = from;
    while (previousStep !== null) {
      trace = ["boardedAt" in previousStep ? { ...previousStep, boardedAt: previousStep.boardedAt[0] } : previousStep, ...trace];

      if (k < 0) throw new Error(`No journey in initRound ${initRound}.`); // Unable to get back to source

      if (!("boardedAt" in previousStep)) {
        if (previousStep.label.time >= this.MAX_SAFE_TIMESTAMP) {
          k--;
          continue;
        }

        previousStep = null;
      } else {
        previousStep = previousStep.boardedAt[1];

        if (
          trace.find(
            (j) =>
              previousStep &&
              "boardedAt" in previousStep &&
              "boardedAt" in j &&
              j.label.time === previousStep.label.time &&
              j.boardedAt === previousStep.boardedAt[0],
          )
        )
          throw new Error(`Impossible journey (cyclic).`);
      }
    }

    return trace;
  }

  getBestJourneys(pt: SI): (null | Journey<SI, RI, []>)[] {
    return Array.from({ length: this.multiLabel.length }, (_, k) => {
      try {
        const ptJourneyStep = this.multiLabel[k].get(pt);
        if (!ptJourneyStep) return null;

        const journey = this.traceBackFromStep(ptJourneyStep, k);
        return journey.reduce((acc, js) => acc + ("route" in js ? 1 : 0), 0) === k ? journey : null;
      } catch {
        return null;
      }
    });
  }
}
