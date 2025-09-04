import { describe } from "@jest/globals";
import { InternalTimeInt, RAPTOR, RAPTORData, Timestamp } from "../src";
import { TestDataset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import oneLineOTA from "./assets/oneLineOTA";
import twoLines from "./assets/twoLines";
import twoLinesOTA from "./assets/twoLinesOTA";
import specialCases from "./assets/specialCases";

for (const [datasetName, dataset] of [oneLine, twoLines, oneLineOTA, twoLinesOTA, specialCases] as TestDataset<Timestamp | InternalTimeInt>[]) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const raptorData = new RAPTORData(...asset.data);
        const raptorInstance = new RAPTOR(raptorData);

        for (const test of asset.tests) {
          raptorInstance.run(...test.params);
          const res = test.params[1] !== null ? raptorInstance.getBestJourneys(test.params[1]) : [];
          test.validate(res, raptorInstance);
        }
      });
    }
  });
}
