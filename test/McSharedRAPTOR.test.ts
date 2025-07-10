import { describe, expect } from "@jest/globals";
import { bufferTime, footDistance, McRAPTOR, McSharedRAPTOR, SharedRAPTORData, sharedTimeScal } from "../src";
import BTOneLine from "./assets/BTOneLine";
import BTTwoLines from "./assets/BTTwoLines";
import FDOneLine from "./assets/FDOneLine";
import FDTwoLines from "./assets/FDTwoLines";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";

// Same as RAPTOR
for (const [datasetName, dataset] of [oneLine, twoLines] as const) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const sharedRaptorData = SharedRAPTORData.makeFromRawData(sharedTimeScal, asset.data[1], asset.data[2]);
        const sharedRaptorInstance = new McSharedRAPTOR(sharedRaptorData, []);

        for (const test of asset.tests) {
          sharedRaptorInstance.run(...test.params);
          const res = sharedRaptorInstance.getBestJourneys(test.params[1]);
          for (const journeys of res) expect(journeys.length || 1).toBe(1);
          test.validate(res.map((journeys) => (journeys.length ? [journeys[0]] : [])));
        }
      });
    }
  });
}

// With foot distance criterion
for (const [datasetName, dataset] of [FDOneLine, FDTwoLines] as const) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const sharedRaptorData = SharedRAPTORData.makeFromRawData(sharedTimeScal, asset.data[1], asset.data[2]);
        const sharedRaptorInstance = new McSharedRAPTOR<number, number, [[number, "footDistance"]]>(sharedRaptorData, [footDistance]);

        for (const test of asset.tests) {
          sharedRaptorInstance.run(...test.params);
          const res = sharedRaptorInstance.getBestJourneys(test.params[1]);
          test.validate(res as ReturnType<McRAPTOR<number, number, [[number, "footDistance"]], number, number, number>["getBestJourneys"]>);
        }
      });
    }
  });
}

// With buffer time criterion
for (const [datasetName, dataset] of [BTOneLine, BTTwoLines] as const) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const sharedRaptorData = SharedRAPTORData.makeFromRawData(sharedTimeScal, asset.data[1], asset.data[2]);
        const sharedRaptorInstance = new McSharedRAPTOR<number, number, [[number, "bufferTime"]]>(sharedRaptorData, [bufferTime]);

        for (const test of asset.tests) {
          sharedRaptorInstance.run(...test.params);
          const res = sharedRaptorInstance.getBestJourneys(test.params[1]);
          test.validate(res as ReturnType<McRAPTOR<number, number, [[number, "bufferTime"]], number, number, number>["getBestJourneys"]>);
        }
      });
    }
  });
}
