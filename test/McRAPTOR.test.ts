import { describe, expect } from "@jest/globals";
import { bufferTime, Criterion, footDistance, McRAPTOR, RAPTORData } from "../src";
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
        const raptorData = new RAPTORData(...(asset.data as TestAsset<number>["data"]));
        const raptorInstance = new McRAPTOR(raptorData, []);

        for (const test of asset.tests) {
          raptorInstance.run(...test.params);
          const res = raptorInstance.getBestJourneys(test.params[1]);
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
        const raptorData = new RAPTORData(...(asset.data as McTestAsset<number, number, [[number, "footDistance"]]>["data"]));
        const raptorInstance = new McRAPTOR<number, number, [[number, "footDistance"]], number, number, number>(raptorData, [
          footDistance as Criterion<number, number, number, number, "footDistance">,
        ]);

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
        const raptorData = new RAPTORData(...(asset.data as McTestAsset<number, number, [[number, "bufferTime"]]>["data"]));
        const raptorInstance = new McRAPTOR<number, number, [[number, "bufferTime"]], number, number, number>(raptorData, [
          bufferTime as Criterion<number, number, number, number, "bufferTime">,
        ]);

        for (const test of asset.tests) {
          raptorInstance.run(...test.params);
          const res = raptorInstance.getBestJourneys(test.params[1]);
          test.validate(res);
        }
      });
    }
  });
}
