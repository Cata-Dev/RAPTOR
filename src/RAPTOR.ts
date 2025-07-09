/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BaseRAPTOR from "./base";
import { Id, Journey, JourneyStep, Label, makeJSComparable, MAX_SAFE_TIMESTAMP, Route, Stop, Timestamp } from "./structures";

/**
 * @description A RAPTOR instance
 */
export default class RAPTOR<SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> extends BaseRAPTOR<SI, RI, TI> {
  /** @description A {@link Label} Ti(SI) represents the earliest known arrival time at stop SI with up to i trips. */
  protected multiLabel: Map<SI, JourneyStep<SI, RI, never, []>>[] = [];

  /**
   * @description Finds the earliest {@link Trip} on the route r at the stop p.
   * @param r Route Id.
   * @param p Stop Id.
   * @returns The earliest {@link Trip} on the route (and its index) r at the stop p, or null if no one is catchable.
   */

  protected init() {
    super.init();

    // Re-initialization
    this.multiLabel = Array.from({ length: this.runParams!.rounds }, () => new Map<SI, JourneyStep<SI, RI, never, []>>());

    // Initialization
    for (const [stopId] of this.stops) {
      this.multiLabel[this.k].set(stopId, makeJSComparable({ label: new Label([], Infinity) }));
    }
    this.multiLabel[this.k].set(this.runParams!.ps, makeJSComparable({ label: new Label([], this.runParams!.departureTime) }));
  }

  protected beginRound() {
    // Copying
    for (const [stopId] of this.stops) {
      const value = this.multiLabel[this.k - 1].get(stopId)!;
      this.multiLabel[this.k].set(stopId, value);
    }
  }

  protected traverseRoute(route: Route<SI, RI, TI>, stop: SI): void {
    let t: ReturnType<typeof this.et> | null = null;

    for (let i = route.stops.indexOf(stop); i < route.stops.length; i++) {
      const pi = route.stops.at(i)!;

      // Improve periods, local & target pruning
      if (t !== null) {
        const arrivalTime: Timestamp = route.trips.at(t.tripIndex)!.times.at(i)![0];
        if (
          arrivalTime <
          Math.min(this.multiLabel[this.k].get(pi)?.label.time ?? Infinity, this.multiLabel[this.k].get(this.runParams!.pt)?.label.time ?? Infinity)
        ) {
          // local & target pruning
          this.multiLabel[this.k].set(
            pi,
            makeJSComparable<SI, RI, never, [], "VEHICLE">({
              boardedAt: [t.boardedAt, this.multiLabel[this.k].get(t.boardedAt)!],
              route,
              tripIndex: t.tripIndex,
              label: new Label([], arrivalTime),
            }),
          );
          this.marked.add(pi);
        }
      }

      const tpiOld = this.multiLabel[this.k - 1].get(pi)?.label.time ?? Infinity;
      if (!t) {
        if (tpiOld < MAX_SAFE_TIMESTAMP) t = this.et(route, pi, tpiOld);
      } else if (tpiOld <= route.departureTime(t.tripIndex, i)) {
        // Catch an earlier trip at pi ?
        const newEt = this.et(route, pi, tpiOld);
        if (t.tripIndex !== newEt?.tripIndex) {
          t = newEt;
        }
      }
    }
  }

  protected traverseFootPaths(stopId: SI, stop: Stop<SI, RI>): void {
    for (const transfer of this.validFootPaths(stop.transfers)) {
      if (transfer.to === stopId) continue;

      const pJourneyStep = this.multiLabel[this.k].get(stopId)!;
      const arrivalTime: Timestamp = pJourneyStep.label.time + this.walkDuration(transfer.length);
      if (arrivalTime < this.multiLabel[this.k].get(transfer.to)!.label.time) {
        this.multiLabel[this.k].set(
          transfer.to,
          makeJSComparable<SI, RI, never, [], "FOOT">({ boardedAt: [stopId, pJourneyStep], transfer, label: new Label([], arrivalTime) }),
        );

        this.marked.add(transfer.to);
      }
    }
  }

  getBestJourneys(pt: SI): (null | Journey<SI, RI, never, []>)[] {
    return Array.from({ length: this.multiLabel.length }, (_, k) => k).reduce<(Journey<SI, RI, never, []> | null)[]>(
      (acc, k) => {
        const ptJourneyStep = this.multiLabel[k].get(pt);
        if (!ptJourneyStep) return acc;

        try {
          const journey = this.traceBackFromStep(ptJourneyStep, k);
          const tripsCount = journey.reduce((acc, js) => acc + ("route" in js ? 1 : 0), 0);
          if ((acc[tripsCount]?.at(-1)?.label.time ?? Infinity) > journey.at(-1)!.label.time) acc[tripsCount] = journey;
          // eslint-disable-next-line no-empty
        } catch (_) {}

        return acc;
      },
      Array.from<never, Journey<SI, RI, never, []> | null>({ length: this.multiLabel.length }, () => null),
    );
  }
}
