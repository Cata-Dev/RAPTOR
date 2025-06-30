import { describe } from "@jest/globals";
import { RAPTOR, RAPTORData } from "../src";
import { TestAsset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";

for (const [datasetName, dataset] of [oneLine, twoLines] as const) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const raptorData = new RAPTORData(...(asset.data as TestAsset["data"]));
        const raptorInstance = new RAPTOR(raptorData);

        for (const test of asset.tests) {
          raptorInstance.run(...test.params);
          const res = raptorInstance.getBestJourneys(test.params[1]);
          test.validate(res);
        }
      });
    }
  });
}
