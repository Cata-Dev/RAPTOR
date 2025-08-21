import { expect, test } from "@jest/globals";
import { McTestDataset } from "./asset";
import oneLine, { MAX_ROUNDS } from "./oneLine";
import { validateWithoutCriteria } from "./utils";

export default [
  "Buffer time, one line",
  {
    withoutTransfers: {
      data: oneLine[1].withoutTransfers.data,
      tests: [
        {
          params: oneLine[1].withoutTransfers.tests[0].params,
          validate: (rap) => {
            const [journeysWithoutCriteria, journeysFromCriteria] = validateWithoutCriteria(
              oneLine[1].withoutTransfers.data[0],
              oneLine[1].withoutTransfers.tests[0].validate,
              oneLine[1].withoutTransfers.tests[0].params[1],
            )(rap);
            test("Label buffer times are exact (same results as RAPTOR)", () => {
              expect(journeysWithoutCriteria[1][0]?.[0].label.value("bufferTime")).toBe(-Infinity);
              expect(journeysWithoutCriteria[1][0]?.at(-1)?.label.value("bufferTime")).toBe(-0);
            });

            test("Label buffer times are exact (new results due to criterion)", () => {
              for (let k = 0; k < 1; ++k) expect(journeysFromCriteria[k].length).toBe(0);
              expect(journeysFromCriteria[1]?.length).toBe(1);
              expect(journeysFromCriteria[1][0][0].label.value("bufferTime")).toBe(-Infinity);
              expect(journeysFromCriteria[1][0].at(-1)?.label.value("bufferTime")).toBe(-3);
              for (let k = 2; k < journeysFromCriteria.length; ++k) expect(journeysFromCriteria[k].length).toBe(0);
            });
          },
        },
      ],
    },
    withSlowTransfers: {
      data: oneLine[1].withSlowTransfers.data,
      tests: [
        {
          params: oneLine[1].withSlowTransfers.tests[0].params,
          validate: (rap) => {
            const res = rap.getBestJourneys(oneLine[1].withSlowTransfers.tests[0].params[1]);
            const [_, journeysFromCriteria] = validateWithoutCriteria(
              oneLine[1].withSlowTransfers.data[0],
              oneLine[1].withSlowTransfers.tests[0].validate,
              oneLine[1].withSlowTransfers.tests[0].params[1],
            )(rap);
            test("Label buffer times are exact (same results as RAPTOR)", () => {
              for (const journeys of res)
                if (journeys[0]) {
                  expect(journeys[0][0].label.value("bufferTime")).toBe(-Infinity);
                  expect(journeys[0].at(-1)?.label.value("bufferTime")).toBe(-0);
                }
            });

            test("Label buffer times are exact (new results due to criterion)", () => {
              for (let k = 0; k < 1; ++k) expect(journeysFromCriteria[k].length).toBe(0);
              expect(journeysFromCriteria[1]?.length).toBe(1);
              expect(journeysFromCriteria[1][0][0].label.value("bufferTime")).toBe(-Infinity);
              expect(journeysFromCriteria[1][0].at(-1)?.label.value("bufferTime")).toBe(-3);
              for (let k = 2; k < journeysFromCriteria.length; ++k) expect(journeysFromCriteria[k].length).toBe(0);
            });
          },
        },
        {
          params: oneLine[1].withSlowTransfers.tests[1].params,
          validate: (rap) => {
            const res = rap.getBestJourneys(oneLine[1].withSlowTransfers.tests[1].params[1]);
            validateWithoutCriteria(
              oneLine[1].withSlowTransfers.data[0],
              oneLine[1].withSlowTransfers.tests[1].validate,
              oneLine[1].withSlowTransfers.tests[1].params[1],
            )(rap);
            for (const journeys of res) expect(journeys.length || 1).toBe(1);
            test("Label buffer times are exact", () => {
              for (const journeys of res)
                if (journeys[0]) {
                  expect(journeys[0][0].label.value("bufferTime")).toBe(-Infinity);
                  expect(journeys[0].at(-1)?.label.value("bufferTime")).toBe(-0);
                }
            });
          },
        },
        {
          params: [
            oneLine[1].withSlowTransfers.tests[0].params[0],
            oneLine[1].withSlowTransfers.tests[0].params[1],
            1,
            oneLine[1].withSlowTransfers.tests[0].params[3],
            oneLine[1].withSlowTransfers.tests[0].params[4],
          ],
          validate: (rap) => {
            const res = rap.getBestJourneys(oneLine[1].withSlowTransfers.tests[0].params[1]);
            test("Run result is exact (mid departure, buffer time > 0)", () => {
              expect(res[0].length).toBe(0);
              for (let i = 2; i < MAX_ROUNDS; ++i) expect(res[i].length).toBe(0);
              expect(res[1]?.length).toBe(1);
              const journey = res[1][0];
              expect(journey.length).toBe(2);
              const js0 = journey[0];
              expect(Object.keys(js0).length).toBe(2);
              expect(Object.keys(js0)).toContain("compare");
              expect(Object.keys(js0)).toContain("label");
              expect(js0.label.time).toBe(1);

              expect(Object.keys(journey[1]).length).toEqual(5);
              expect(journey[1].label.time).toBe(9);
              const js1 = journey[1];
              if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");
              expect(js1.boardedAt).toBe(1);
              expect(js1.route.id).toBe(1);
              expect(js1.tripIndex).toBe(1);
              expect(js1.label.value("bufferTime")).toBe(-2);
            });
          },
        },
      ],
    },
    withFastTransfers: {
      data: oneLine[1].withFastTransfers.data,
      tests: [
        {
          params: oneLine[1].withFastTransfers.tests[0].params,
          validate: (rap) => {
            const [journeysWithoutCriteria, journeysFromCriteria] = validateWithoutCriteria(
              oneLine[1].withFastTransfers.data[0],
              oneLine[1].withFastTransfers.tests[0].validate,
              oneLine[1].withFastTransfers.tests[0].params[1],
            )(rap);

            test("Label buffer times are exact (same results as RAPTOR)", () => {
              expect(journeysWithoutCriteria[1][0]?.[1].label.value("bufferTime")).toBe(-0);
              expect(journeysWithoutCriteria[1][0]?.[2].label.value("bufferTime")).toBe(-0);
            });
            test("Label buffer times are exact (new results due to criterion)", () => {
              for (let k = 0; k < 1; ++k) expect(journeysFromCriteria[k].length).toBe(0);
              expect(journeysFromCriteria[1]?.length).toBe(3);
              expect(journeysFromCriteria[1][0][0].label.value("bufferTime")).toBe(-Infinity);
              expect(journeysFromCriteria[1][0].at(-1)?.label.value("bufferTime")).toBe(-3);

              expect(journeysFromCriteria[1][1].at(-1)?.label.value("bufferTime")).toBe(-1);

              expect(journeysFromCriteria[1][2].at(-1)?.label.value("bufferTime")).toBe(-4);
              for (let k = 2; k < journeysFromCriteria.length; ++k) expect(journeysFromCriteria[k].length).toBe(0);
            });
          },
        },
      ],
    },
  },
] satisfies McTestDataset<number, number, [[number, "bufferTime"]]>;
