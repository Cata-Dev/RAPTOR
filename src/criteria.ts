import { Criterion, Id, JourneyStep } from "./structures";

function isCriterionJourneyStepVehicle<SI extends Id, RI extends Id, C extends string[]>(
  js: Parameters<Criterion<SI, RI, C>["update"]>[1],
): js is JourneyStep<SI, RI, C, "VEHICLE"> {
  return "route" in js;
}

function isCriterionJourneyStepFoot<SI extends Id, RI extends Id, C extends string[]>(
  js: Parameters<Criterion<SI, RI, C>["update"]>[1],
): js is JourneyStep<SI, RI, C, "FOOT"> {
  return "transfer" in js;
}

const bufferTime: Criterion<Id, Id, ["bufferTime"]> = {
  name: "bufferTime",
  initialValue: Infinity,
  update: (prefixJourney, newJourneyStep) => {
    const lastJourneyStep = prefixJourney.at(-1);
    if (!lastJourneyStep) throw new Error("A journey should at least contain the DEPARTURE label.");

    if (!isCriterionJourneyStepVehicle(newJourneyStep)) return lastJourneyStep.label.value("bufferTime");

    return Math.min(
      lastJourneyStep.label.value("bufferTime"),
      -(
        newJourneyStep.route.departureTime(newJourneyStep.tripIndex, newJourneyStep.route.stops.indexOf(newJourneyStep.boardedAt[0])) -
        lastJourneyStep.label.time
      ),
    );
  },
};

const footDistance: Criterion<Id, Id, ["footDistance"]> = {
  name: "footDistance",
  initialValue: 0,
  update: (prefixJourney, newJourneyStep) => {
    const lastJourneyStep = prefixJourney.at(-1);
    if (!lastJourneyStep) throw new Error("A journey should at least contain the DEPARTURE label.");

    return lastJourneyStep.label.value("footDistance") + (isCriterionJourneyStepFoot(newJourneyStep) ? newJourneyStep.transfer.length : 0);
  },
};

export { bufferTime, footDistance };
