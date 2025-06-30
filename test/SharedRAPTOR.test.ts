import { describe } from "@jest/globals";
import { SharedRAPTOR, SharedRAPTORData } from "../src";
import { TestAsset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";

for (const [datasetName, dataset] of [oneLine, twoLines] as const) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const sharedRaptorData = SharedRAPTORData.makeFromRawData(...(asset.data as TestAsset["data"]));
        const sharedRaptorInstance = new SharedRAPTOR(sharedRaptorData);

        for (const test of asset.tests) {
          sharedRaptorInstance.run(...test.params);
          const res = sharedRaptorInstance.getBestJourneys(test.params[1]);
          test.validate(res);
        }
      });
    }
  });
}
