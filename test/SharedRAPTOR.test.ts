import { describe } from "@jest/globals";
import { SharedRAPTOR, SharedRAPTORData, sharedTimeScal } from "../src";
import BaseRAPTOR from "../src/base";
import { TestDataset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import oneLineOTA from "./assets/oneLineOTA";
import twoLines from "./assets/twoLines";

for (const [datasetName, dataset] of [oneLine, twoLines, oneLineOTA as TestDataset<number>] as const) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const sharedRaptorData = SharedRAPTORData.makeFromRawData(sharedTimeScal, asset.data[1], asset.data[2]);
        const sharedRaptorInstance = new SharedRAPTOR(sharedRaptorData);

        for (const test of asset.tests) {
          sharedRaptorInstance.run(...test.params);
          const res = test.params[1] !== null ? sharedRaptorInstance.getBestJourneys(test.params[1]) : [];
          test.validate(res, sharedRaptorInstance as BaseRAPTOR<number, number, number, number>);
        }
      });
    }
  });
}
