import { describe } from "@jest/globals";
import { RAPTOR, RAPTORData } from "../src/main";
import { TestAsset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";

describe("One line", () => {
  for (const [datasetName, dataset] of Object.entries(oneLine) as [keyof typeof oneLine, TestAsset][]) {
    describe(datasetName, () => {
      const raptorData = new RAPTORData(...dataset.data);
      const raptorInstance = new RAPTOR(raptorData);

      for (const test of dataset.tests) {
        raptorInstance.run(...test.params);
        const res = raptorInstance.getBestJourneys(test.params[1]);
        test.validate(res);
      }
    });
  }
});

describe("Two lines", () => {
  for (const [datasetName, dataset] of Object.entries(twoLines) as [keyof typeof twoLines, TestAsset][]) {
    describe(datasetName, () => {
      const raptorData = new RAPTORData(...dataset.data);
      const raptorInstance = new RAPTOR(raptorData);

      for (const test of dataset.tests) {
        raptorInstance.run(...test.params);
        const res = raptorInstance.getBestJourneys(test.params[1]);
        test.validate(res);
      }
    });
  }
});
