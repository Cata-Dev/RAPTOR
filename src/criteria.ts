import { Criterion, Id, JourneyStep, Ordered } from "./structures";

function isCriterionJourneyStepVehicle<SI extends Id, RI extends Id, V extends Ordered<V>, CA extends [V, string][]>(
  js: Parameters<Criterion<SI, RI, V, CA[number][1]>["update"]>[1],
): js is JourneyStep<SI, RI, V, CA, "VEHICLE"> {
  return "route" in js;
}

function isCriterionJourneyStepFoot<SI extends Id, RI extends Id, V extends Ordered<V>, CA extends [V, string][]>(
  js: Parameters<Criterion<SI, RI, V, CA[number][1]>["update"]>[1],
): js is JourneyStep<SI, RI, V, CA, "FOOT"> {
  return "transfer" in js;
}

const bufferTime: Criterion<Id, Id, number, "bufferTime"> = {
  name: "bufferTime",
  initialValue: -Infinity,
  update: (prefixJourney, newJourneyStep) => {
    const lastJourneyStep = prefixJourney.at(-1);
    if (!lastJourneyStep) throw new Error("A journey should at least contain the DEPARTURE label.");

    if (!isCriterionJourneyStepVehicle(newJourneyStep)) return lastJourneyStep.label.value("bufferTime");

    return Math.max(
      lastJourneyStep.label.value("bufferTime"),
      -(
        newJourneyStep.route.departureTime(newJourneyStep.tripIndex, newJourneyStep.route.stops.indexOf(newJourneyStep.boardedAt[0])) -
        lastJourneyStep.label.time
      ),
      -(30 * 60 * 1000),
    );
  },
};

const footDistance: Criterion<Id, Id, number, "footDistance"> = {
  name: "footDistance",
  initialValue: 0,
  update: (prefixJourney, newJourneyStep) => {
    const lastJourneyStep = prefixJourney.at(-1);
    if (!lastJourneyStep) throw new Error("A journey should at least contain the DEPARTURE label.");

    return lastJourneyStep.label.value("footDistance") + (isCriterionJourneyStepFoot(newJourneyStep) ? newJourneyStep.transfer.length : 0);
  },
};

export { bufferTime, footDistance };
