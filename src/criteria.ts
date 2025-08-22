import { Criterion, Id, InternalTimeInt, Journey, JourneyStep, Label, makeJSComparable, Time, TimeScal } from "./structures";

function isCriterionJourneyStepVehicle<TimeVal, SI extends Id, RI extends Id, V, CA extends [V, string][]>(
  js: Parameters<Criterion<TimeVal, SI, RI, V, CA[number][1]>["update"]>[1],
): js is JourneyStep<TimeVal, SI, RI, V, CA, "VEHICLE"> {
  return "route" in js;
}

function isCriterionJourneyStepFoot<TimeVal, SI extends Id, RI extends Id, V, CA extends [V, string][]>(
  js: Parameters<Criterion<TimeVal, SI, RI, V, CA[number][1]>["update"]>[1],
): js is JourneyStep<TimeVal, SI, RI, V, CA, "FOOT"> {
  return "transfer" in js;
}

/**
 * Buffer Time criterion as described in *Round-Based Public Transit Routing* (Daniel Delling, Thomas Pajor, Renato F. Werneck, 2015).
 *
 * It computes the minimum of the free times between connections (i.e. the time before taking a vehicle) of the whole journey.
 */
const bufferTime: Criterion<unknown, Id, Id, number, "bufferTime"> = {
  name: "bufferTime",
  initialValue: -Infinity,
  order: TimeScal.strict.order,
  update: (prefixJourney, newJourneyStep, timeType) => {
    const lastJourneyStep = prefixJourney.at(-1);
    if (!lastJourneyStep) throw new Error("A journey should at least contain the DEPARTURE step.");

    if (!isCriterionJourneyStepVehicle(newJourneyStep)) return lastJourneyStep.label.value("bufferTime");

    const diff =
      timeType.low(newJourneyStep.route.departureTime(newJourneyStep.tripIndex, newJourneyStep.route.stops.indexOf(newJourneyStep.boardedAt[0]))) -
      timeType.up(lastJourneyStep.label.time);
    if (diff < 0) return 0;

    return Math.max(lastJourneyStep.label.value("bufferTime"), -diff, -(30 * 60 * 1000));
  },
};

/**
 * Foot distance criterion.
 *
 * It simply accumulates foot distance over the whole journey.
 */
const footDistance: Criterion<unknown, Id, Id, number, "footDistance"> = {
  name: "footDistance",
  initialValue: 0,
  order: TimeScal.strict.order,
  update: (prefixJourney, newJourneyStep) => {
    const lastJourneyStep = prefixJourney.at(-1);
    if (!lastJourneyStep) throw new Error("A journey should at least contain the DEPARTURE step.");

    return lastJourneyStep.label.value("footDistance") + (isCriterionJourneyStepFoot(newJourneyStep) ? newJourneyStep.transfer.length : 0);
  },
};

/**
 * Success probability criterion -- interval time only.
 *
 * It computes the minimum success probability of the connection during the journey.
 */
const successProbaInt: Criterion<InternalTimeInt, Id, Id, number, "successProbaInt"> = {
  name: "successProbaInt",
  initialValue: -1,
  order: TimeScal.strict.order,
  update: (prefixJourney, newJourneyStep, timeType) => {
    const lastJourneyStep = prefixJourney.at(-1);
    if (!lastJourneyStep) throw new Error("A journey should at least contain the DEPARTURE step.");

    if (!isCriterionJourneyStepVehicle(newJourneyStep))
      // Probability of success is about feasibility of a boarding, i.e. taking a vehicle
      // Going by foot is always 100% feasible
      return lastJourneyStep.label.value("successProbaInt");

    const prevLow = timeType.low(lastJourneyStep.label.time);
    const prevUp = timeType.up(lastJourneyStep.label.time);

    const tDep = newJourneyStep.route.departureTime(newJourneyStep.tripIndex, newJourneyStep.route.stops.indexOf(newJourneyStep.boardedAt[0]));

    const newLow = timeType.low(tDep);
    const newUp = timeType.up(tDep);

    return (
      lastJourneyStep.label.value("successProbaInt") *
      (newLow > prevUp
        ? // No intersection, 100% feasible
          1
        : newUp < prevLow
          ? // No intersection, 0% feasible -- should never happen
            0
          : // Intersects somehow, add segments in absolute value
            ((prevLow < newLow
              ? // Feasible segment
                // [ ...
                //   [ ...
                1 * (newLow - prevLow)
              : prevLow > newLow
                ? // Infeasible segment
                  //   [ ...
                  // [ ...
                  0 * (prevLow - newLow)
                : 0) +
              (prevUp < newUp
                ? // Feasible segment
                  // ... ]
                  //   ... ]
                  1 * (newUp - prevUp)
                : prevUp > newUp
                  ? // Infeasible segment
                    //   ... ]
                    // ... ]
                    0 * (prevUp - newUp)
                  : 0) +
              // Uncertain segment
              // ... [   ] ...
              // ... [   ] ...
              0.5 * (Math.min(prevUp, newUp) - Math.max(prevLow, newLow) + 1)) /
            // Divide by width to get relative value in [0,1]
            (Math.max(prevUp, newUp) - Math.min(prevLow, newLow) + 1))
    );
  },
};

/**
 * Parametrized criterion "Mean Risk" from *Practical Route Planning Under Delay Uncertainty: Stochastic Shortest Path Queries* (Sejoon Lim AND Christian Sommer AND Evdokia Nikolova AND Daniela Rus, 2012)
 * @param c Risk-aversion coefficient
 * @returns Mean Risk criterion. The risk-aversion coefficient {@link c} is appended to the criterion name.
 */
const meanRiskInit = <C extends number>(c: C): Criterion<InternalTimeInt, Id, Id, number, `meanRisk-${C}`> => ({
  initialValue: NaN,
  name: `meanRisk-${c}`,
  order: TimeScal.strict.order,
  update: (_, __, timeType, time) => {
    const timeWidth = timeType.up(time) - timeType.low(time);
    const timeMean = timeWidth / 2;

    return timeMean + c * timeWidth;
  },
});

/**
 * Run a criterion against an already computed journey.
 * @param criterion Criterion to evaluate
 * @param timeType Time type used to compute the journey
 * @param journey Journey to measure
 * @param pt Target stop
 */
function measureJourney<TimeVal, SI extends Id, RI extends Id, V, CA extends [V, string][], T, N extends string>(
  criterion: Criterion<TimeVal, SI, RI, T, N>,
  timeType: Time<TimeVal>,
  journey: Journey<TimeVal, SI, RI, V, CA>,
  pt: SI,
) {
  return journey.reduce<Journey<TimeVal, SI, RI, V | T, [...CA, [T, N]]>>(
    (acc, js, i) => {
      const rebasedJS = {
        ...js,
        ...("boardedAt" in js
          ? // Not a DEPARTURE journey step
            {
              boardedAt:
                // Need to provide previous journey step
                [js.boardedAt, acc[i - 1]],
            }
          : {}),
        label: js.label.criteria.reduce(
          (acc, criterion) =>
            (acc as Label<TimeVal, SI, RI, V, CA>).setValue(criterion.name, js.label.value(criterion.name)) as unknown as Label<
              TimeVal,
              SI,
              RI,
              V | T,
              [...CA, [T, N]]
            >,
          new Label<TimeVal, SI, RI, V | T, [...CA, [T, N]]>(timeType, [...js.label.criteria, criterion], js.label.time),
        ),
      };

      return [
        ...acc,
        i < 1
          ? makeJSComparable<TimeVal, SI, RI, V | T, [...CA, [T, N]]>({
              ...rebasedJS,
            })
          : {
              ...makeJSComparable({
                ...rebasedJS,
                label: (rebasedJS.label as unknown as Label<TimeVal, SI, RI, T, [[T, N]]>).setValue(
                  criterion.name,
                  criterion.update(
                    acc as unknown as Journey<TimeVal, SI, RI, T, [[T, N]]>,
                    rebasedJS,
                    timeType,
                    rebasedJS.label.time,
                    i + 1 < journey.length ? (journey[i + 1] as JourneyStep<TimeVal, SI, RI, V, CA, "FOOT" | "VEHICLE", true>).boardedAt : pt,
                  ),
                ) as unknown as Label<TimeVal, SI, RI, V | T, [...CA, [T, N]]>,
              }),
              ...("boardedAt" in js
                ? // Not a DEPARTURE journey step
                  {
                    boardedAt: js.boardedAt,
                  }
                : {}),
            },
      ];
    },
    // Prefix
    [],
  );
}

export { bufferTime, footDistance, meanRiskInit, measureJourney, successProbaInt };
