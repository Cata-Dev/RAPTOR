/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BaseRAPTOR from "./base";
import { Bag, Criterion, Id, IRAPTORData, IStop, Journey, JourneyStep, Label, makeJSComparable, Route } from "./structures";

export default class McRAPTOR<TimeVal, V, CA extends [V, string][], SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> extends BaseRAPTOR<
  TimeVal,
  SI,
  RI,
  TI,
  V,
  CA
> {
  /** @description A {@link Label} Bags_i(SI) stores earliest known arrival times and best values for criteria at stop `SI` with up to `i` trips. */
  protected bags: Map<SI, Bag<JourneyStep<TimeVal, SI, RI, V, CA>>>[] = [];

  /**
   * For target pruning
   * Hence, it's `null` <=> {@link runParams}`.pt` is `null` (one-to-all request)
   */
  protected Bpt: Bag<JourneyStep<TimeVal, SI, RI, V, CA>> | null = null;

  /**
   * @description Creates a new McRAPTOR instance for a defined network and a set of {@link criteria}.
   */
  constructor(
    data: IRAPTORData<TimeVal, SI, RI, TI>,
    protected readonly criteria: { [K in keyof CA]: Criterion<TimeVal, SI, RI, CA[K][0], CA[K][1]> },
  ) {
    super(data);
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
    route: Route<TimeVal, SI, RI, TI>,
    stop: SI,
    stopIndex: number,
    fromJourneyStep: JourneyStep<TimeVal, SI, RI, V, CA>,
    cb: (newJourneyStep: JourneyStep<TimeVal, SI, RI, V, CA, "VEHICLE">) => void,
  ) {
    const backTrace = this.traceBackFromStep(fromJourneyStep, this.k);
    let t = this.et(route, stop, fromJourneyStep.label.time);
    const previousLabels: Label<TimeVal, SI, RI, V, CA>[] = [];
    while (t) {
      const tArr = route.trips.at(t.tripIndex)!.times.at(stopIndex)![0];
      const partialJourneyStep = {
        boardedAt: [stop, fromJourneyStep] satisfies [SI, unknown],
        route,
        tripIndex: t.tripIndex,
      };
      const label = fromJourneyStep.label.update(tArr, [
        backTrace as Journey<TimeVal, SI, RI, V, [[V, CA[number][1]]]>,
        partialJourneyStep,
        this.time,
        tArr,
        stop,
      ]);
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
    this.bags = Array.from({ length: this.runParams!.rounds }, () => new Map<SI, Bag<JourneyStep<TimeVal, SI, RI, V, CA>>>());

    // Initialization
    for (const [stopId] of this.stops) {
      this.bags[0].set(stopId, new Bag<JourneyStep<TimeVal, SI, RI, V, CA>>());
    }
    this.bags[0].get(this.runParams!.ps)!.add(
      makeJSComparable({
        label: new Label(this.time, this.criteria, this.runParams!.departureTime),
      }),
    );
  }

  protected beginRound() {
    // Copying
    for (const [stopId] of this.stops) {
      const journeySteps = this.bags[this.k - 1].get(stopId)!;
      const newBag = Bag.from(journeySteps);
      this.bags[this.k].set(stopId, newBag);
    }
    if (this.runParams!.pt !== null) this.Bpt = this.bags[this.k].get(this.runParams!.pt)!;
  }

  protected traverseRoute(route: Route<TimeVal, SI, RI, TI>, stop: SI): void {
    let RouteBag = new Bag<JourneyStep<TimeVal, SI, RI, V, CA, "VEHICLE">>();

    for (let i = route.stops.indexOf(stop); i < route.stops.length; i++) {
      const pi = route.stops.at(i)!;

      // Step 1: update route labels w.r.t. current stop pi
      // Need to use a temporary bag, otherwise updating makes the bag incoherent and comparison occurs on incomparable journey steps (they are not at the same stop)
      const RouteBagPi = new Bag<JourneyStep<TimeVal, SI, RI, V, CA, "VEHICLE">>();
      for (const journeyStep of RouteBag) {
        const tArr = route.trips.at(journeyStep.tripIndex)!.times.at(i)![0];
        RouteBagPi.addOnly(
          makeJSComparable({
            ...journeyStep,
            label: journeyStep.label.update(tArr, [
              this.traceBackFromStep(journeyStep.boardedAt[1], this.k) as Journey<TimeVal, SI, RI, V, [[V, CA[number][1]]]>,
              { ...journeyStep },
              this.time,
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
      const { added } = Bpi.merge(RouteBag as Bag<JourneyStep<TimeVal, SI, RI, V, CA>>);
      if (
        added > 0 &&
        // Target pruning, don't mark if all labels are worse than any of the target
        // Otherwise, it might contribute to a new better (or incomparable) label (= journey)
        (this.Bpt === null || this.Bpt.size == 0 || this.Bpt.values().some((jsPt) => Bpi.values().some((jsPi) => (jsPi.compare(jsPt) ?? 1) > 0)))
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

  protected traverseFootPaths(stopId: SI, stop: IStop<SI, RI>): void {
    for (const pJourneyStep of this.bags[this.k].get(stopId)!) {
      // Prevent chaining transfers
      if ("transfer" in pJourneyStep) continue;

      const pBackTrace = this.traceBackFromStep(pJourneyStep, this.k);

      for (const transfer of stop.transfers(this.runParams!.settings.maxTransferLength)) {
        if (transfer.to === stopId) continue;

        const arrivalTime: TimeVal = this.time.plusScal(pJourneyStep.label.time, this.walkDuration(transfer.length));

        const Bpto = this.bags[this.k].get(transfer.to)!;
        const { added } = Bpto.add(
          makeJSComparable<TimeVal, SI, RI, V, CA, "FOOT">({
            boardedAt: [stopId, pJourneyStep],
            transfer,
            label: pJourneyStep.label.update(arrivalTime, [
              pBackTrace as Journey<TimeVal, SI, RI, V, [[V, CA[number][1]]]>,
              { boardedAt: [stopId, pJourneyStep], transfer },
              this.time,
              arrivalTime,
              transfer.to,
            ]),
          }),
        );
        if (
          added &&
          // Target pruning
          (this.Bpt === null || this.Bpt.size == 0 || this.Bpt.values().some((jsPt) => Bpto.values().some((jsPto) => (jsPto.compare(jsPt) ?? 1) > 0)))
        )
          this.marked.add(transfer.to);
      }
    }
  }

  getBestJourneys(pt: SI): Journey<TimeVal, SI, RI, V, CA>[][] {
    return Array.from({ length: this.bags.length }, (_, k) => k).reduce<Journey<TimeVal, SI, RI, V, CA>[][]>(
      (acc, k) => {
        const ptJourneySteps = this.bags[k].get(pt);
        if (!ptJourneySteps) return acc;

        for (const js of ptJourneySteps) {
          const journey = this.traceBackFromStep(js, k);
          const tripsCount = journey.reduce((acc, js) => acc + ("route" in js ? 1 : 0), 0);
          if (
            !acc[tripsCount]?.some(
              (alrJourney) =>
                alrJourney.length === journey.length &&
                alrJourney.every((js, i) =>
                  // Deep compare objects as they don't have the same address
                  Object.keys(journey[i]).every(
                    (key) =>
                      journey[i][key as keyof Journey<TimeVal, SI, RI, V, CA>[number]] === js[key as keyof Journey<TimeVal, SI, RI, V, CA>[number]],
                  ),
                ),
            )
          )
            acc[tripsCount].push(journey);
        }

        return acc;
      },
      Array.from<never, Journey<TimeVal, SI, RI, V, CA>[]>({ length: this.bags.length }, () => []),
    );
  }
}
