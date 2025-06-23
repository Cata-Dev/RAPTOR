import McRAPTOR from "../src/McRAPTOR";
import { Criterion, Id, JourneyStep } from "../src/Structures";

function isJourneyStepVehicle<SI extends Id, RI extends Id, C extends string[]>(
  js: Omit<JourneyStep<SI, RI, C>, "label">,
): js is JourneyStep<SI, RI, C, "VEHICLE"> {
  return "route" in js;
}

const bufferTime: Criterion<Id, Id, ["bufferTime"]> = {
  name: "bufferTime",
  update: (prefixJourney, newJourneyStep) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lastJourneyStep = prefixJourney.at(-1)!;
    return Math.min(
      lastJourneyStep.label.value("bufferTime"),
      isJourneyStepVehicle(newJourneyStep) && "boardedAt" in lastJourneyStep && newJourneyStep.boardedAt != lastJourneyStep.boardedAt
        ? lastJourneyStep.label.time -
            newJourneyStep.route.departureTime(newJourneyStep.tripIndex, newJourneyStep.route.stops.indexOf(newJourneyStep.boardedAt))
        : Infinity,
    );
  },
};
