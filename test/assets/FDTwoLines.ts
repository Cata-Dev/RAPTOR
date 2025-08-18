import { expect, test } from "@jest/globals";
import { McTestDataset } from "./asset";
import twoLines from "./twoLines";
import { validateWithoutCriteria } from "./utils";

export default [
  "Foot distance, two lines",
  {
    withoutTransfers: {
      data: twoLines[1].withoutTransfers.data,
      tests: [
        {
          params: twoLines[1].withoutTransfers.tests[0].params,
          validate: (rap) => {
            const res = rap.getBestJourneys(twoLines[1].withoutTransfers.tests[0].params[1]);
            validateWithoutCriteria(
              twoLines[1].withoutTransfers.data[0],
              twoLines[1].withoutTransfers.tests[0].validate,
              twoLines[1].withoutTransfers.tests[0].params[1],
            )(rap);
            for (const journeys of res) expect(journeys.length || 1).toBe(1);
            test("Label foot distances are exact", () => {
              for (const journeys of res) if (journeys[0]) expect(journeys[0].at(-1)?.label.value("footDistance")).toBe(0);
            });
          },
        },
      ],
    },
    withSlowTransfers: {
      data: twoLines[1].withSlowTransfers.data,
      tests: [
        {
          params: twoLines[1].withSlowTransfers.tests[0].params,
          validate: (rap) => {
            const res = rap.getBestJourneys(twoLines[1].withSlowTransfers.tests[0].params[1]);
            validateWithoutCriteria(
              twoLines[1].withSlowTransfers.data[0],
              twoLines[1].withSlowTransfers.tests[0].validate,
              twoLines[1].withSlowTransfers.tests[0].params[1],
            )(rap);
            for (const journeys of res) expect(journeys.length || 1).toBe(1);
            test("Label foot distances are exact", () => {
              for (const journey of res[1]) expect(journey.at(-1)?.label.value("footDistance")).toBe(5);
            });
          },
        },
      ],
    },
    withFastTransfers: {
      data: twoLines[1].withFastTransfers.data,
      tests: [
        {
          params: twoLines[1].withFastTransfers.tests[0].params,
          validate: (rap) => {
            const [journeysWithoutCriteria, journeysFromCriteria] = validateWithoutCriteria(
              twoLines[1].withFastTransfers.data[0],
              twoLines[1].withFastTransfers.tests[0].validate,
              twoLines[1].withFastTransfers.tests[0].params[1],
            )(rap);
            test("Label foot distances are exact (same results as RAPTOR)", () => {
              expect(journeysWithoutCriteria[1][0]?.at(-1)?.label.value("footDistance")).toBe(5);
              expect(journeysWithoutCriteria[2][0]?.at(-1)?.label.value("footDistance")).toBe(3);
            });

            test("Label foot distances are exact (new results due to criterion)", () => {
              for (let k = 0; k < 2; ++k) expect(journeysFromCriteria[k].length).toBe(0);
              expect(journeysFromCriteria[2]?.length).toBe(1);
              expect(journeysFromCriteria[2][0].at(-1)?.label.value("footDistance")).toBe(0);
              for (let k = 3; k < journeysFromCriteria.length; ++k) expect(journeysFromCriteria[k].length).toBe(0);
            });
          },
        },
        {
          params: twoLines[1].withFastTransfers.tests[1].params,
          validate: (rap) => {
            const res = rap.getBestJourneys(twoLines[1].withFastTransfers.tests[1].params[1]);
            validateWithoutCriteria(
              twoLines[1].withFastTransfers.data[0],
              twoLines[1].withFastTransfers.tests[1].validate,
              twoLines[1].withFastTransfers.tests[1].params[1],
            )(rap);
            for (const journeys of res) expect(journeys.length || 1).toBe(1);
            test("Label foot distances are exact", () => {
              for (const journey of res[1]) expect(journey.at(-1)?.label.value("footDistance")).toBe(5);
              for (const journey of res[2]) expect(journey.at(-1)?.label.value("footDistance")).toBe(0);
            });
          },
        },
      ],
    },
    withMandatoryTransfer: {
      data: twoLines[1].withMandatoryTransfer.data,
      tests: [
        {
          params: twoLines[1].withMandatoryTransfer.tests[0].params,
          validate: (rap) => {
            const res = rap.getBestJourneys(twoLines[1].withMandatoryTransfer.tests[0].params[1]);
            validateWithoutCriteria(
              twoLines[1].withMandatoryTransfer.data[0],
              twoLines[1].withMandatoryTransfer.tests[0].validate,
              twoLines[1].withMandatoryTransfer.tests[0].params[1],
            )(rap);
            for (const journeys of res) expect(journeys.length || 1).toBe(1);
            test("Label foot distances are exact", () => {
              expect(res[2][0].at(-1)?.label.value("footDistance")).toBe(5);
            });
          },
        },
      ],
    },
  },
] satisfies McTestDataset<number, number, [[number, "footDistance"]]>;
