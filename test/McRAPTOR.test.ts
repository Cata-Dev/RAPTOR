import { describe, expect } from "@jest/globals";
import { McRAPTOR, RAPTORData } from "../src/main";
import { TestAsset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";

for (const [datasetName, dataset] of [
  ["One line", oneLine],
  ["Two lines", twoLines],
] as const) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const raptorData = new RAPTORData(...(asset.data as TestAsset["data"]));
        const raptorInstance = new McRAPTOR(raptorData, []);

        for (const test of asset.tests) {
          raptorInstance.run(...test.params);
          const res = raptorInstance.getBestJourneys(test.params[1]);
          for (const journeys of res) expect(journeys?.length ?? 1).toBe(1);
          test.validate(res.map((journeys) => (journeys ? journeys[0] : journeys)));
        }
      });
    }
  });
}
