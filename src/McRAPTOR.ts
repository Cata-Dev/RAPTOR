/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BaseRAPTOR from "./base";
import {
  Bag,
  Criterion,
  Id,
  IRAPTORData,
  Journey,
  JourneyStep,
  Label,
  makeJSComparable,
  MAX_SAFE_TIMESTAMP,
  Ordered,
  Route,
  Stop,
  Timestamp,
} from "./structures";

export default class McRAPTOR<
  V extends Ordered<V>,
  CA extends [V, string][],
  SI extends Id = Id,
  RI extends Id = Id,
  TI extends Id = Id,
> extends BaseRAPTOR<SI, RI, TI, V, CA> {
  /** @description A {@link Label} Bags_i(SI) stores earliest known arrival times and best values for criteria at stop `SI` with up to `i` trips. */
  protected bags: Map<SI, Bag<JourneyStep<SI, RI, V, CA>>>[] = [];

  // For target pruning
  protected Bpt: Bag<JourneyStep<SI, RI, V, CA>> | null = null;

  /**
   * @description Creates a new McRAPTOR instance for a defined network and a set of {@link criteria}.
   */
  constructor(
    data: IRAPTORData<SI, RI, TI>,
    protected readonly criteria: { [K in keyof CA]: Criterion<SI, RI, CA[K][0], CA[K][1]> },
  ) {
    super(data);
  }

  /**
   * @description Finds the earliest {@link Trip} on route `r` at stop `p` departing after `after`.
   * @param r Route Id.
   * @param p Stop Id.
   * @param after Time after which trips should be considered
   * @param startTripIndex Trip index to start iterating from
   * @returns The earliest {@link Trip} on the route (and its index) `r` at the stop `p`, or `null` if no one is catchable.
   */
  protected et(route: Route<SI, RI>, p: SI, after: Timestamp, startTripIndex = 0): { tripIndex: number; boardedAt: SI } | null {
    for (let t = startTripIndex; t < route.trips.length; t++) {
      // Catchable?
      const tDep = route.departureTime(t, route.stops.indexOf(p));
      if (tDep < MAX_SAFE_TIMESTAMP && tDep >= after) return { tripIndex: t, boardedAt: p };
    }

    return null;
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
    fromJourneyStep: JourneyStep<SI, RI, V, CA>,
    cb: (newJourneyStep: JourneyStep<SI, RI, V, CA, "VEHICLE">) => void,
  ) {
    const backTrace = this.traceBackFromStep(fromJourneyStep, this.k);
    let t = this.et(route, stop, fromJourneyStep.label.time);
    const previousLabels: Label<SI, RI, V, CA>[] = [];
    while (t) {
      const tArr = route.trips.at(t.tripIndex)!.times.at(stopIndex)![0];
      const partialJourneyStep = {
        boardedAt: [stop, fromJourneyStep] satisfies [SI, unknown],
        route,
        tripIndex: t.tripIndex,
      };
      const label = fromJourneyStep.label.update(tArr, [backTrace as Journey<SI, RI, V, [[V, CA[number][1]]]>, partialJourneyStep, tArr, stop]);
      if (previousLabels.some((previousLabel) => (label.compare(previousLabel) ?? 2) <= 0))
        // New label is dominated, stop looking for earliest catchable trips
        break;

      cb(makeJSComparable({ ...partialJourneyStep, label }));

      previousLabels.push(label);
      t = this.et(
        route,
        stop,
        fromJourneyStep.label.time,
        // Force taking a future trip
        t.tripIndex + 1,
      );
    }
  }

  protected init() {
    super.init();

    // Re-initialization
    this.bags = Array.from({ length: this.runParams!.rounds }, () => new Map<SI, Bag<JourneyStep<SI, RI, V, CA>>>());

    // Initialization
    for (const [stopId] of this.stops) {
      this.bags[0].set(stopId, new Bag<JourneyStep<SI, RI, V, CA>>());
    }
    this.bags[0].get(this.runParams!.ps)!.add(
      makeJSComparable({
        label: new Label(this.criteria, this.runParams!.departureTime),
      }),
    );
  }

  protected beginRound() {
    // Copying
    for (const [stopId] of this.stops) {
      const journeySteps = this.bags[this.k - 1].get(stopId)!;
      const newBag = Bag.from(journeySteps);
      this.bags[this.k].set(stopId, newBag);

      if (stopId === this.runParams!.pt) this.Bpt = newBag;
    }
  }

  protected traverseRoute(route: Route<SI, RI, TI>, stop: SI): void {
    let RouteBag = new Bag<JourneyStep<SI, RI, V, CA, "VEHICLE">>();

    for (let i = route.stops.indexOf(stop); i < route.stops.length; i++) {
      const pi = route.stops.at(i)!;

      // Step 1: update route labels w.r.t. current stop pi
      // Need to use a temporary bag, otherwise updating makes the bag incoherent and comparison occurs on incomparable journey steps (they are not at the same stop)
      const RouteBagPi = new Bag<JourneyStep<SI, RI, V, CA, "VEHICLE">>();
      for (const journeyStep of RouteBag) {
        const tArr = route.trips.at(journeyStep.tripIndex)!.times.at(i)![0];
        RouteBagPi.addOnly(
          makeJSComparable({
            ...journeyStep,
            label: journeyStep.label.update(tArr, [
              this.traceBackFromStep(journeyStep.boardedAt[1], this.k) as Journey<SI, RI, V, [[V, CA[number][1]]]>,
              { ...journeyStep },
              tArr,
              pi,
            ]),
          }),
        );
      }
      RouteBagPi.prune();
      RouteBag = RouteBagPi;

      // Step 2: non-dominated merge of route bag to current round stop bag
      const Bpi = this.bags[this.k].get(pi)!;
      const { added } = Bpi.merge(RouteBag as Bag<JourneyStep<SI, RI, V, CA>>);
      if (
        added > 0 &&
        // Target pruning, don't mark if all labels are worse than any of the target
        // Otherwise, it might contribute to a new better (or incomparable) label (= journey)
        (this.Bpt!.size == 0 || this.Bpt!.values().some((jsPt) => Bpi.values().some((jsPi) => (jsPi.compare(jsPt) ?? 1) > 0)))
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
          if (!("route" in journeyStep) || journeyStep.route.id != route.id || newJourneyStep.tripIndex != journeyStep.tripIndex)
            RouteBag.addOnly(newJourneyStep);
        });
      RouteBag.prune();
    }
  }

  protected traverseFootPaths(stopId: SI, stop: Stop<SI, RI>): void {
    for (const pJourneyStep of this.bags[this.k].get(stopId)!) {
      // Prevent chaining transfers
      if ("transfer" in pJourneyStep) continue;

      const pBackTrace = this.traceBackFromStep(pJourneyStep, this.k);

      for (const transfer of this.validFootPaths(stop.transfers)) {
        if (transfer.to === stopId) continue;

        const arrivalTime: Timestamp = pJourneyStep.label.time + this.walkDuration(transfer.length);

        const Bpto = this.bags[this.k].get(transfer.to)!;
        const { added } = Bpto.add(
          makeJSComparable<SI, RI, V, CA, "FOOT">({
            boardedAt: [stopId, pJourneyStep],
            transfer,
            label: pJourneyStep.label.update(arrivalTime, [
              pBackTrace as Journey<SI, RI, V, [[V, CA[number][1]]]>,
              { boardedAt: [stopId, pJourneyStep], transfer },
              arrivalTime,
              transfer.to,
            ]),
          }),
        );
        if (
          added &&
          // Target pruning
          (this.Bpt!.size == 0 || this.Bpt!.values().some((jsPt) => Bpto.values().some((jsPto) => (jsPto.compare(jsPt) ?? 1) > 0)))
        )
          this.marked.add(transfer.to);
      }
    }
  }

  getBestJourneys(pt: SI): Journey<SI, RI, V, CA>[][] {
    return Array.from({ length: this.bags.length }, (_, k) => k).reduce<Journey<SI, RI, V, CA>[][]>(
      (acc, k) => {
        const ptJourneySteps = this.bags[k].get(pt);
        if (!ptJourneySteps) return acc;

        for (const js of ptJourneySteps) {
          const journey = this.traceBackFromStep(js, k);
          const tripsCount = journey.reduce((acc, js) => acc + ("route" in js ? 1 : 0), 0);
          if (
            !acc[tripsCount].some(
              (alrJourney) =>
                alrJourney.length === journey.length &&
                alrJourney.every((js, i) =>
                  // Deep compare object as it doesn't have the same address
                  Object.keys(journey[i]).every(
                    (key) => journey[i][key as keyof Journey<SI, RI, V, CA>[number]] === js[key as keyof Journey<SI, RI, V, CA>[number]],
                  ),
                ),
            )
          )
            acc[tripsCount].push(journey);
        }

        return acc;
      },
      Array.from<never, Journey<SI, RI, V, CA>[]>({ length: this.bags.length }, () => []),
    );
  }
}
