/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BaseRAPTOR, { RAPTORRunSettings } from "./base";
import RAPTOR from "./RAPTOR";
import { Bag, Criterion, Id, IRAPTORData, Journey, JourneyStep, Label, makeJSComparable, MAX_SAFE_TIMESTAMP, Route, timestamp } from "./structures";

export default class McRAPTOR<C extends string[], SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> extends BaseRAPTOR<C, SI, RI, TI> {
  /** @description A {@link Label} Bags_i(SI) stores earliest known arrival times and best values for criteria at stop `SI` with up to `i` trips. */
  protected bags: Map<SI, Bag<JourneyStep<SI, RI, C>>>[] = [];
  /** Set<{@link SI} in {@link stops}> */
  protected marked = new Set<SI>();

  protected pt: SI | null = null;

  /**
   * @description Creates a new McRAPTOR instance for a defined network and a set of {@link criteria}.
   */
  constructor(
    data: IRAPTORData<SI, RI, TI>,
    protected readonly criteria: { [K in keyof C]: Criterion<SI, RI, C> },
  ) {
    super(data);
  }

  /**
   * @description Finds the earliest {@link Trip} on route `r` at stop `p` departing after `after`.
   * @param r Route Id.
   * @param p Stop Id.
   * @param after Time after which trips should be considered
   * @returns The earliest {@link Trip} on the route (and its index) `r` at the stop `p`, or `null` if no one is catchable.
   */
  protected et(route: Route<SI, RI>, p: SI, after: timestamp): { tripIndex: number; boardedAt: SI } | null {
    for (let t = 0; t < route.trips.length; t++) {
      // Catchable?
      const tDep = route.departureTime(t, route.stops.indexOf(p));
      if (tDep < MAX_SAFE_TIMESTAMP && tDep >= after) return { tripIndex: t, boardedAt: p };
    }

    return null;
  }

  protected footPathsLookup(walkSpeed: RAPTORRunSettings["walkSpeed"]) {
    const Bpt = this.bags[this.k].get(this.pt!)!;

    // Copy current state of marked stops
    for (const p of new Set(this.marked)) {
      const stop = this.stops.get(p)!;

      for (const transfer of stop.transfers) {
        if (transfer.to === p) continue;

        for (const pJourneyStep of this.bags[this.k].get(p)!) {
          // Prevent chaining transfers
          if ("transfer" in pJourneyStep) continue;

          const arrivalTime: timestamp = pJourneyStep.label.time + this.walkDuration(transfer.length, walkSpeed);

          const Bpto = this.bags[this.k].get(transfer.to)!;
          const { added } = Bpto.add(
            makeJSComparable<SI, RI, C, "FOOT">({
              boardedAt: [p, pJourneyStep],
              transfer,
              label: pJourneyStep.label.update(arrivalTime, [
                this.traceBackFromStep(pJourneyStep, this.k),
                { boardedAt: [p, pJourneyStep], transfer },
                arrivalTime,
                transfer.to,
              ]),
            }),
          );
          if (
            added &&
            // Target pruning
            (Bpt.size == 0 || Bpt.values().some((jsPt) => Bpto.values().some((jsPto) => (jsPto.compare(jsPt) ?? 1) > 0)))
          )
            this.marked.add(transfer.to);
        }
      }
    }
  }

  /**
   * Scans earliest catchable trips after taking step {@link fromJourneyStep}, on route {@link route} at stop {@link stop} ({@link stopIndex}), and executes a callback {@link cb}.
   * @param route Route to scan for trips
   * @param stop Stop where boarding should take place
   * @param stopIndex Index of stop
   * @param fromJourneyStep Journey step from which to board
   * @param cb A callback taking any new feasible journey step
   */
  protected forEachNDEt(
    route: Route<SI, RI, TI>,
    stop: SI,
    stopIndex: number,
    fromJourneyStep: JourneyStep<SI, RI, C>,
    cb: (newJourneyStep: JourneyStep<SI, RI, C, "VEHICLE">) => void,
  ) {
    let t = this.et(route, stop, fromJourneyStep.label.time);
    const previousLabels: Label<SI, RI, C>[] = [];
    while (t) {
      const tArr = route.trips.at(t.tripIndex)!.times.at(stopIndex)![0];
      const partialJourneyStep = {
        boardedAt: [stop, fromJourneyStep] satisfies [SI, unknown],
        route,
        tripIndex: t.tripIndex,
      };
      const label = fromJourneyStep.label.update(tArr, [this.traceBackFromStep(fromJourneyStep, this.k), partialJourneyStep, tArr, stop]);
      if (previousLabels.some((previousLabel) => (label.compare(previousLabel) ?? 2) <= 0))
        // New label is dominated, stop looking for earliest catchable trips
        break;

      cb(makeJSComparable({ ...partialJourneyStep, label }));

      previousLabels.push(label);
      t = this.et(
        route,
        stop,
        route.departureTime(t.tripIndex, stopIndex) +
          // Force taking a future trip
          // Implies the time step between 2 trips is at least 1
          1,
      );
    }
  }

  run(ps: SI, pt: SI, departureTime: timestamp, settings: RAPTORRunSettings, rounds: number = RAPTOR.defaultRounds) {
    //Re-initialization
    this.bags = Array.from({ length: rounds }, () => new Map<SI, Bag<JourneyStep<SI, RI, C>>>());
    this.marked = new Set<SI>();
    this.k = 0;
    this.pt = pt;

    // Initialization
    for (const [stopId] of this.stops) {
      this.bags[0].set(stopId, new Bag<JourneyStep<SI, RI, C>>());
    }
    this.bags[0].get(ps)!.add(
      makeJSComparable({
        label: new Label(this.criteria, departureTime),
      }),
    );
    this.marked.add(ps);

    /** Map<{@link RI} in {@link routes}, {@link SI} in {@link stops}> */
    const Q = new Map<RI, SI>();

    // k=0: check for direct foot path to pt
    const transferToPt = this.stops
      .get(ps)!
      .transfers[Symbol.iterator]()
      .find((transfer) => transfer.to === pt);
    if (transferToPt) {
      const psJS = this.bags[0].get(ps)!.values().next().value!;
      const tArr = departureTime + this.walkDuration(transferToPt.length, settings.walkSpeed);
      const newJS = { boardedAt: [ps, psJS] satisfies [SI, unknown], transfer: transferToPt };
      this.bags[this.k].get(pt)!.add(
        makeJSComparable<SI, RI, C, "FOOT">({
          ...newJS,
          label: psJS.label.update(tArr, [[psJS], newJS, tArr, pt]),
        }),
      );
    }

    for (this.k = 1; this.k < rounds; this.k++) {
      // Copying
      for (const [stopId] of this.stops) {
        const journeySteps = this.bags[this.k - 1].get(stopId)!;
        // Prevent changing k-1 journey steps
        for (const journeyStep of journeySteps) {
          Object.freeze(journeyStep.label);
          Object.freeze(journeyStep);
        }
        this.bags[this.k].set(stopId, Bag.from(journeySteps));
      }
      if (this.k === 1)
        // Be sure to not take into account the early, direct foot transfer
        this.bags[this.k].set(pt, new Bag<JourneyStep<SI, RI, C>>());
      const Bpt = this.bags[this.k].get(pt)!;

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
        let RouteBag = new Bag<JourneyStep<SI, RI, C, "VEHICLE">>();

        const route = this.routes.get(r)!;
        for (let i = route.stops.indexOf(p); i < route.stops.length; i++) {
          const pi = route.stops.at(i)!;

          // Step 1: update route labels w.r.t. current stop pi
          // Need to use a temporary bag, otherwise updating makes the bag incoherent and comparison occurs on incomparable journey steps (they are not at the same stop)
          const RouteBagPi = new Bag<JourneyStep<SI, RI, C, "VEHICLE">>();
          for (const journeyStep of RouteBag) {
            const tArr = route.trips.at(journeyStep.tripIndex)!.times.at(i)![0];
            RouteBagPi.addOnly(
              makeJSComparable({
                ...journeyStep,
                label: journeyStep.label.update(tArr, [this.traceBackFromStep(journeyStep.boardedAt[1], this.k), { ...journeyStep }, tArr, pi]),
              }),
            );
          }
          RouteBagPi.prune();
          RouteBag = RouteBagPi;

          // Step 2: non-dominated merge of route bag to current round stop bag
          const Bpi = this.bags[this.k].get(pi)!;
          const { added } = Bpi.merge(RouteBag as Bag<JourneyStep<SI, RI, C>>);
          if (
            added > 0 &&
            // Target pruning, don't mark if all labels are worse than any of the target
            // Otherwise, it might contribute to a new better (or incomparable) label (= journey)
            (Bpt.size == 0 || Bpt.values().some((jsPt) => Bpi.values().some((jsPi) => (jsPi.compare(jsPt) ?? 1) > 0)))
          )
            this.marked.add(pi);

          // Step 3: populating route bag with previous round & update
          // Update current route bag with possible new earliest catchable trips thanks to this round
          for (const journeyStep of RouteBag)
            this.forEachNDEt(route, pi, i, journeyStep, (newJourneyStep) => {
              if (newJourneyStep.tripIndex != journeyStep.tripIndex) RouteBag.addOnly(newJourneyStep);
            });
          for (const journeyStep of this.bags[this.k - 1].get(pi)!)
            this.forEachNDEt(route, pi, i, journeyStep, (newJourneyStep) => {
              if (!("route" in journeyStep) || journeyStep.route.id != r || newJourneyStep.tripIndex != journeyStep.tripIndex)
                RouteBag.addOnly(newJourneyStep);
            });
          RouteBag.prune();
        }
      }

      // Look at foot-paths
      this.footPathsLookup(settings.walkSpeed);

      // Stopping criterion
      if (this.marked.size === 0) break;
    }
  }

  getBestJourneys(pt: SI): (null | Journey<SI, RI, C>[])[] {
    return Array.from({ length: this.bags.length }, (_, k): null | Journey<SI, RI, C>[] => {
      const ptJourneySteps = this.bags[k].get(pt);
      if (!ptJourneySteps) return null;

      const journeys = ptJourneySteps
        .values()
        .map((js) => {
          try {
            const journey = this.traceBackFromStep(js, k);
            return journey.reduce((acc, js) => acc + ("route" in js ? 1 : 0), 0) === k ? journey : null;
          } catch (_) {
            return null;
          }
        })
        .filter((j) => !!j)
        .toArray();
      return journeys.length ? journeys : null;
    });
  }
}
