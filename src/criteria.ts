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

const bufferTime: Criterion<unknown, Id, Id, number, "bufferTime"> = {
  name: "bufferTime",
  initialValue: -Infinity,
  order: TimeScal.strict.order,
  update: (prefixJourney, newJourneyStep, timeType) => {
    const lastJourneyStep = prefixJourney.at(-1);
    if (!lastJourneyStep) throw new Error("A journey should at least contain the DEPARTURE step.");

    if (!isCriterionJourneyStepVehicle(newJourneyStep)) return lastJourneyStep.label.value("bufferTime");

    return Math.max(
      lastJourneyStep.label.value("bufferTime"),
      -(
        timeType.low(newJourneyStep.route.departureTime(newJourneyStep.tripIndex, newJourneyStep.route.stops.indexOf(newJourneyStep.boardedAt[0]))) -
        timeType.up(lastJourneyStep.label.time)
      ),
      -(30 * 60 * 1000),
    );
  },
};

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

export { bufferTime, footDistance, measureJourney, successProbaInt };
