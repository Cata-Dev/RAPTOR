import { describe } from "@jest/globals";
import { RAPTOR, RAPTORData } from "../src/main";
import { TestAsset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";

for (const [datasetName, dataset] of [
  ["One line", oneLine],
  ["Two lines", twoLines],
] satisfies [unknown, unknown][]) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset) as [keyof typeof dataset, TestAsset][]) {
      describe(assetName, () => {
        const raptorData = new RAPTORData(...asset.data);
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
