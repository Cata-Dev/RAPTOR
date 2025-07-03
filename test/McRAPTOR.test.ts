import { describe, expect } from "@jest/globals";
import { bufferTime, footDistance, McRAPTOR, RAPTORData } from "../src";
import BTOneLine from "./assets/BTOneLine";
import FDOneLine from "./assets/FDOneLine";
import { McTestAsset, TestAsset } from "./assets/asset";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";
import FDTwoLines from "./assets/FDTwoLines";
import BTTwoLines from "./assets/BTTwoLines";

// Same as RAPTOR
for (const [datasetName, dataset] of [oneLine, twoLines] as const) {
  describe(datasetName, () => {
    for (const [assetName, asset] of Object.entries(dataset)) {
      describe(assetName, () => {
        const raptorData = new RAPTORData(...(asset.data as TestAsset["data"]));
        const raptorInstance = new McRAPTOR(raptorData, []);

        for (const test of asset.tests) {
          raptorInstance.run(...test.params);
          const res = raptorInstance.getBestJourneys(test.params[1]);
          for (const journeys of res) expect(journeys.length || 1).toBe(1);
          test.validate(res.map((journeys) => (journeys.length > 0 ? journeys[0] : null)));
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
        const raptorData = new RAPTORData(...(asset.data as McTestAsset<["footDistance"]>["data"]));
        const raptorInstance = new McRAPTOR<["footDistance"], number, number, number>(raptorData, [footDistance]);

        for (const test of asset.tests) {
          raptorInstance.run(...test.params);
          const res = raptorInstance.getBestJourneys(test.params[1]);
          test.validate(res);
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
        const raptorData = new RAPTORData(...(asset.data as McTestAsset<["bufferTime"]>["data"]));
        const raptorInstance = new McRAPTOR<["bufferTime"], number, number, number>(raptorData, [bufferTime]);

        for (const test of asset.tests) {
          raptorInstance.run(...test.params);
          const res = raptorInstance.getBestJourneys(test.params[1]);
          test.validate(res);
        }
      });
    }
  });
}
