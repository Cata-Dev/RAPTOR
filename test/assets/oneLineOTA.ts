import { expect, test } from "@jest/globals";
import { TestAsset, TestDataset } from "./asset";
import oneLine, { MAX_ROUNDS } from "./oneLine";

const PARAMS = [1, null, 0, { walkSpeed: 1 * 1_000, maxTransferLength: 100 }, MAX_ROUNDS] satisfies TestAsset<number>["tests"][number]["params"];

/**
 * 1 route with 4 stops and 2 trips
 */
export default [
  "One line OTA",
  {
    withoutTransfers: {
      data: oneLine[1].withoutTransfers.data,
      tests: [
        {
          params: PARAMS,
          validate: (_, rap) => {
            oneLine[1].withoutTransfers.tests[0].validate(rap.getBestJourneys(oneLine[1].withoutTransfers.tests[0].params[1]), rap);
            test("All stops have journeys", () => {
              for (const [stopId] of oneLine[1].withoutTransfers.data[1]) expect(rap.getBestJourneys(stopId).some((journeys) => journeys.length));
            });
          },
        },
      ],
    },
    withSlowTransfers: {
      data: oneLine[1].withSlowTransfers.data,
      tests: [
        {
          params: PARAMS,
          validate: (_, rap) => {
            oneLine[1].withSlowTransfers.tests[0].validate(rap.getBestJourneys(oneLine[1].withSlowTransfers.tests[0].params[1]), rap);
            test("All stops have journeys", () => {
              for (const [stopId] of oneLine[1].withSlowTransfers.data[1]) expect(rap.getBestJourneys(stopId).some((journeys) => journeys.length));
            });
          },
        },
        {
          params: [PARAMS[0], PARAMS[1], 4, PARAMS[3], PARAMS[4]],
          validate: (_, rap) => {
            oneLine[1].withSlowTransfers.tests[1].validate(rap.getBestJourneys(oneLine[1].withSlowTransfers.tests[1].params[1]), rap);
            test("All stops have journeys", () => {
              for (const [stopId] of oneLine[1].withSlowTransfers.data[1]) expect(rap.getBestJourneys(stopId).some((journeys) => journeys.length));
            });
          },
        },
      ],
    },
    withFastTransfers: {
      data: oneLine[1].withFastTransfers.data,
      tests: [
        {
          params: PARAMS,
          validate: (_, rap) => {
            oneLine[1].withFastTransfers.tests[0].validate(rap.getBestJourneys(oneLine[1].withFastTransfers.tests[0].params[1]));
            test("All stops have journeys", () => {
              for (const [stopId] of oneLine[1].withFastTransfers.data[1]) expect(rap.getBestJourneys(stopId).some((journeys) => journeys.length));
            });
          },
        },
      ],
    },
  },
] satisfies TestDataset<number>;
