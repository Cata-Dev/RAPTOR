/* eslint-disable @typescript-eslint/no-non-null-assertion */
import BaseRAPTOR, { RAPTORRunSettings } from "./base";
import RAPTOR from "./RAPTOR";
import { Bag, Criterion, Id, IRAPTORData, Journey, JourneyStep, Label, makeJSComparable, Route, timestamp } from "./structures";

export default class McRAPTOR<C extends string[], SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> extends BaseRAPTOR<SI, RI, TI> {
  /** @description A {@link Label} Ti(SI) represents the earliest known arrival time at stop SI with up to i trips. */
  protected bags: Map<SI, Bag<JourneyStep<SI, RI, C>>>[] = [];
  /** Set<{@link SI} in {@link stops}> */
  protected marked = new Set<SI>();

  /**
   * @description Creates a new McRAPTOR instance for a defined network and a set of {@link criteria}.
   */
  constructor(
    data: IRAPTORData<SI, RI, TI>,
    protected readonly criteria: { [K in keyof C]: Criterion<SI, RI, C> },
  ) {
    super(data);
  }

  protected makeBag() {
    return new Bag<JourneyStep<SI, RI, C>>();
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
      if (tDep < this.MAX_SAFE_TIMESTAMP && tDep >= after) return { tripIndex: t, boardedAt: p };
    }

    return null;
  }

  protected footPathsLookup(walkSpeed: RAPTORRunSettings["walkSpeed"]) {
    // Copy current state of marked stops
    for (const p of new Set(this.marked)) {
      const stop = this.stops.get(p)!;

      for (const transfer of stop.transfers) {
        if (transfer.to === p) continue;

        for (const pJourneyStep of this.bags[this.k].get(p)!) {
          const arrivalTime: timestamp = pJourneyStep.label.time + this.walkDuration(transfer.length, walkSpeed);

          const { added } = this.bags[this.k].get(transfer.to)!.add(
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
          if (added) this.marked.add(transfer.to);
        }
      }
    }
  }

  run(ps: SI, pt: SI, departureTime: timestamp, settings: RAPTORRunSettings, rounds: number = RAPTOR.defaultRounds) {
    //Re-initialization
    this.bags = Array.from({ length: rounds }, () => new Map<SI, Bag<JourneyStep<SI, RI, C>>>());
    this.marked = new Set<SI>();
    this.k = 0;

    // Initialization
    for (const [stopId] of this.stops) {
      this.bags[0].set(stopId, this.makeBag());
    }
    this.bags[0].get(ps)!.add(
      makeJSComparable({
        label: new Label(this.criteria, departureTime),
      }),
    );
    this.marked.add(ps);

    // Preliminary foot-paths lookup to join stops close to ps => use them in first round as fake departure stops
    this.footPathsLookup(settings.walkSpeed);

    /** Map<{@link RI} in {@link routes}, {@link SI} in {@link stops}> */
    const Q = new Map<RI, SI>();

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
        const RouteBag = this.makeBag() as Bag<JourneyStep<SI, RI, C, "VEHICLE">>;

        const route: Route<SI, RI> = this.routes.get(r)!;
        for (let i = route.stops.indexOf(p); i < route.stops.length; i++) {
          const pi = route.stops.at(i)!;

          // Step 1: update route labels w.r.t. current stop pi
          for (const journeyStep of RouteBag) {
            const tArr = route.trips.at(journeyStep.tripIndex)!.times.at(i)![0];
            RouteBag.updateOnly(journeyStep, {
              ...journeyStep,
              label: journeyStep.label.update(tArr, [this.traceBackFromStep(journeyStep.boardedAt[1], this.k), { ...journeyStep }, tArr, pi]),
            });
          }
          RouteBag.prune();

          // Step 2: non-dominated merge of route bag to current round stop bag
          const { added } = this.bags[this.k].get(pi)!.merge(RouteBag as Bag<JourneyStep<SI, RI, C>>);
          if (added > 0) this.marked.add(pi);

          // Step 3: populating route bag with previous round & update
          for (const journeyStep of RouteBag) {
            const t = this.et(route, pi, journeyStep.label.time);
            if (t && (journeyStep.route.id != r || journeyStep.tripIndex != t.tripIndex))
              RouteBag.updateOnly(
                journeyStep,
                makeJSComparable({
                  boardedAt: [pi, journeyStep],
                  route,
                  tripIndex: t.tripIndex,
                  label: new Label(this.criteria, route.trips.at(t.tripIndex)!.times.at(i)![0]),
                }),
              );
          }
          for (const journeyStep of this.bags[this.k - 1].get(pi)!) {
            const t = this.et(route, pi, journeyStep.label.time);
            if (t && (!("route" in journeyStep) || journeyStep.route.id != r || journeyStep.tripIndex != t.tripIndex))
              RouteBag.add(
                makeJSComparable({
                  boardedAt: [pi, journeyStep],
                  route,
                  tripIndex: t.tripIndex,
                  label: new Label(this.criteria, route.trips.at(t.tripIndex)!.times.at(i)![0]),
                }),
              );
          }
          RouteBag.prune();
        }
      }

      // Look at foot-paths
      this.footPathsLookup(settings.walkSpeed);

      // Stopping criterion
      if (this.marked.size === 0) break;
    }
  }

  protected traceBackFromStep(from: JourneyStep<SI, RI, C>, initRound: number): Journey<SI, RI, C> {
    if (initRound < 0 || initRound > this.bags.length) throw new Error(`Invalid initRound (${initRound}) provided.`);

    let k = initRound;
    let trace: Journey<SI, RI, C> = [];

    let previousStep: JourneyStep<SI, RI, C> | null = from;
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

  getBestJourneys(pt: SI): (null | Journey<SI, RI, C>[])[] {
    return Array.from({ length: this.bags.length }, (_, k): null | Journey<SI, RI, C>[] => {
      const ptJourneySteps = this.bags[k].get(pt);
      if (!ptJourneySteps) return null;

      const journeys = ptJourneySteps
        .values()
        .map((js) => {
          try {
            return this.traceBackFromStep(js, k);
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
