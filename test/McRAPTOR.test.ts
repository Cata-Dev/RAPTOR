import { describe, expect } from "@jest/globals";
import { McRAPTOR, RAPTORData } from "../src/main";
import { TestAsset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";

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
