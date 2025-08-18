import { expect, test } from "@jest/globals";
import { TestAsset, TestDataset } from "./asset";
import twoLines, { MAX_ROUNDS } from "./twoLines";

const PARAMS = [1, null, 0, { walkSpeed: 1 * 1_000, maxTransferLength: 100 }, MAX_ROUNDS] satisfies TestAsset<number>["tests"][number]["params"];

/**
 * 2 routes with 4 stops and 2 trips each
 */
export default [
  "Two lines OTA",
  {
    withoutTransfers: {
      data: twoLines[1].withoutTransfers.data,
      tests: [
        {
          params: PARAMS,
          validate: (_, rap) => {
            twoLines[1].withoutTransfers.tests[0].validate(rap.getBestJourneys(twoLines[1].withoutTransfers.tests[0].params[1]));
            test("All stops have journeys", () => {
              for (const [stopId] of twoLines[1].withoutTransfers.data[1]) expect(rap.getBestJourneys(stopId).some((journeys) => journeys.length));
            });
          },
        },
      ],
    },
    withSlowTransfers: {
      data: twoLines[1].withSlowTransfers.data,
      tests: [
        {
          params: PARAMS,
          validate: (_, rap) => {
            twoLines[1].withSlowTransfers.tests[0].validate(rap.getBestJourneys(twoLines[1].withSlowTransfers.tests[0].params[1]));
            test("All stops have journeys", () => {
              for (const [stopId] of twoLines[1].withSlowTransfers.data[1]) expect(rap.getBestJourneys(stopId).some((journeys) => journeys.length));
            });
          },
        },
      ],
    },
    withFastTransfers: {
      data: twoLines[1].withFastTransfers.data,
      tests: [
        {
          params: PARAMS,
          validate: (_, rap) => {
            twoLines[1].withFastTransfers.tests[0].validate(rap.getBestJourneys(twoLines[1].withFastTransfers.tests[0].params[1]));
            test("All stops have journeys", () => {
              for (const [stopId] of twoLines[1].withFastTransfers.data[1]) expect(rap.getBestJourneys(stopId).some((journeys) => journeys.length));
            });
          },
        },
        {
          params: [PARAMS[0], PARAMS[1], 2, PARAMS[3], PARAMS[4]],
          validate: (_, rap) => {
            twoLines[1].withFastTransfers.tests[1].validate(rap.getBestJourneys(twoLines[1].withFastTransfers.tests[1].params[1]));
            test("All stops have journeys", () => {
              for (const [stopId] of twoLines[1].withFastTransfers.data[1]) expect(rap.getBestJourneys(stopId).some((journeys) => journeys.length));
            });
          },
        },
      ],
    },
    withMandatoryTransfer: {
      data: twoLines[1].withMandatoryTransfer.data,
      tests: [
        {
          params: [1, null, 0, PARAMS[3], PARAMS[4]] as typeof PARAMS,
          validate: (_, rap) => {
            twoLines[1].withMandatoryTransfer.tests[0].validate(rap.getBestJourneys(twoLines[1].withMandatoryTransfer.tests[0].params[1]));
            test("All stops have journeys", () => {
              for (const [stopId] of twoLines[1].withMandatoryTransfer.data[1])
                expect(rap.getBestJourneys(stopId).some((journeys) => journeys.length));
            });
          },
        },
      ],
    },
  },
] satisfies TestDataset<number>;

export { MAX_ROUNDS };
