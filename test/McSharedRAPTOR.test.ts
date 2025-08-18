import { describe, expect } from "@jest/globals";
import { bufferTime, Criterion, footDistance, McRAPTOR, McSharedRAPTOR, SharedID, SharedRAPTORData, sharedTimeScal } from "../src";
import BaseRAPTOR from "../src/base";
import { TestDataset } from "./assets/asset";
import BTOneLine from "./assets/BTOneLine";
import BTTwoLines from "./assets/BTTwoLines";
import FDOneLine from "./assets/FDOneLine";
import FDTwoLines from "./assets/FDTwoLines";
import oneLine from "./assets/oneLine";
import oneLineOTA from "./assets/oneLineOTA";
import twoLines from "./assets/twoLines";

// Same as RAPTOR
for (const [datasetName, dataset] of [oneLine, twoLines, oneLineOTA as TestDataset<number>] as const) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const sharedRaptorData = SharedRAPTORData.makeFromRawData(sharedTimeScal, asset.data[1], asset.data[2]);
        const sharedRaptorInstance = new McSharedRAPTOR(sharedRaptorData, []);

        for (const test of asset.tests) {
          sharedRaptorInstance.run(...test.params);
          const res = test.params[1] !== null ? sharedRaptorInstance.getBestJourneys(test.params[1]) : [];
          for (const journeys of res) expect(journeys.length || 1).toBe(1);
          test.validate(
            res.map((journeys) => (journeys.length ? [journeys[0]] : [])),
            sharedRaptorInstance as BaseRAPTOR<number, number, number, number>,
          );
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
        const sharedRaptorInstance = new McSharedRAPTOR<number, number, [[number, "footDistance"]]>(sharedRaptorData, [
          footDistance as Criterion<number, SharedID, SharedID, number, "footDistance">,
        ]);

        for (const test of asset.tests) {
          sharedRaptorInstance.run(...test.params);
          test.validate(sharedRaptorInstance as McRAPTOR<number, number, [[number, "footDistance"]], number, number, number>);
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
        const sharedRaptorInstance = new McSharedRAPTOR<number, number, [[number, "bufferTime"]]>(sharedRaptorData, [
          bufferTime as Criterion<number, SharedID, SharedID, number, "bufferTime">,
        ]);

        for (const test of asset.tests) {
          sharedRaptorInstance.run(...test.params);
          test.validate(sharedRaptorInstance as McRAPTOR<number, number, [[number, "bufferTime"]], number, number, number>);
        }
      });
    }
  });
}
