import { describe, expect } from "@jest/globals";
import { McRAPTOR, /*Criterion, Id, JourneyStep,*/ RAPTORData } from "../src/main";
import { TestAsset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";

/*
function isJourneyStepVehicle<SI extends Id, RI extends Id, C extends string[]>(
  js: Parameters<Criterion<SI, RI, C>["update"]>[1],
): js is JourneyStep<SI, RI, C, "VEHICLE"> {
  return "route" in js;
}

const bufferTime: Criterion<Id, Id, ["bufferTime"]> = {
  name: "bufferTime",
  update: (prefixJourney, newJourneyStep) => {
    const lastJourneyStep = prefixJourney.at(-1)!;
    return Math.min(
      lastJourneyStep.label.value("bufferTime"),
      isJourneyStepVehicle(newJourneyStep) && "boardedAt" in lastJourneyStep && newJourneyStep.boardedAt[0] != lastJourneyStep.boardedAt
        ? lastJourneyStep.label.time -
            newJourneyStep.route.departureTime(newJourneyStep.tripIndex, newJourneyStep.route.stops.indexOf(newJourneyStep.boardedAt[0]))
        : Infinity,
    );
  },
};
*/

describe("One line", () => {
  for (const [datasetName, dataset] of Object.entries(oneLine) as [keyof typeof oneLine, TestAsset][]) {
    describe(datasetName, () => {
      const raptorData = new RAPTORData(...dataset.data);
      const raptorInstance = new McRAPTOR(raptorData, []);

      for (const test of dataset.tests) {
        raptorInstance.run(...test.params);
        const res = raptorInstance.getBestJourneys(test.params[1]);
        for (const journeys of res) expect(journeys?.length ?? 1).toBe(1);
        test.validate(res.map((journeys) => (journeys ? journeys[0] : journeys)));
      }
    });
  }
});

describe("Two lines", () => {
  for (const [datasetName, dataset] of Object.entries(twoLines) as [keyof typeof twoLines, TestAsset][]) {
    describe(datasetName, () => {
      const raptorData = new RAPTORData(...dataset.data);
      const raptorInstance = new McRAPTOR(raptorData, []);

      for (const test of dataset.tests) {
        raptorInstance.run(...test.params);
        const res = raptorInstance.getBestJourneys(test.params[1]);
        for (const journeys of res) expect(journeys?.length ?? 1).toBe(1);
        test.validate(res.map((journeys) => (journeys ? journeys[0] : journeys)));
      }
    });
  }
});
