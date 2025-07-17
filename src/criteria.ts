import { Criterion, Id, JourneyStep, TimeScal } from "./structures";

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
  order: TimeScal.order,
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
  order: TimeScal.order,
  update: (prefixJourney, newJourneyStep) => {
    const lastJourneyStep = prefixJourney.at(-1);
    if (!lastJourneyStep) throw new Error("A journey should at least contain the DEPARTURE step.");

    return lastJourneyStep.label.value("footDistance") + (isCriterionJourneyStepFoot(newJourneyStep) ? newJourneyStep.transfer.length : 0);
  },
};

export { bufferTime, footDistance };
