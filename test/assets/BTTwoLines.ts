import { expect, test } from "@jest/globals";
import { McTestDataset } from "./asset";
import twoLines from "./twoLines";
import { validateWithoutCriteria } from "./utils";

export default [
  "Buffer time, two lines",
  {
    withoutTransfers: {
      data: twoLines[1].withoutTransfers.data,
      tests: [
        {
          params: twoLines[1].withoutTransfers.tests[0].params,
          validate: (res) => {
            validateWithoutCriteria(twoLines[1].withoutTransfers.data[0], twoLines[1].withoutTransfers.tests[0].validate)(res);
            for (const journeys of res) expect(journeys.length || 1).toBe(1);
            test("Label buffer times are exact", () => {
              expect(res[2]?.[0].at(-1)?.label.value("bufferTime")).toBe(-0);
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
          validate: (res) => {
            const [journeysWithoutCriteria, journeysFromCriteria] = validateWithoutCriteria(
              twoLines[1].withSlowTransfers.data[0],
              twoLines[1].withSlowTransfers.tests[0].validate,
            )(res);
            test("Label buffer times are exact (same results as RAPTOR)", () => {
              expect(journeysWithoutCriteria[1][0]?.at(-1)?.label.value("bufferTime")).toBe(-0);
              expect(journeysWithoutCriteria[2][0]?.at(-1)?.label.value("bufferTime")).toBe(-0);
            });

            test("Label buffer times are exact (new results due to criterion)", () => {
              for (let k = 0; k < 1; ++k) expect(journeysFromCriteria[k].length).toBe(0);
              expect(journeysFromCriteria[1].length).toBe(1);
              expect(journeysFromCriteria[1][0][0].label.value("bufferTime")).toBe(-Infinity);
              expect(journeysFromCriteria[1][0].at(-1)?.label.value("bufferTime")).toBe(-2);
              for (let k = 2; k < journeysFromCriteria.length; ++k) expect(journeysFromCriteria[k].length).toBe(0);
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
          validate: (res) => {
            const [journeysWithoutCriteria, journeysFromCriteria] = validateWithoutCriteria(
              twoLines[1].withFastTransfers.data[0],
              twoLines[1].withFastTransfers.tests[0].validate,
            )(res);
            test("Label buffer times are exact (same results as RAPTOR)", () => {
              expect(journeysWithoutCriteria[1][0]?.at(-1)?.label.value("bufferTime")).toBe(-0);
              expect(journeysWithoutCriteria[2][0]?.at(-1)?.label.value("bufferTime")).toBe(-0);
            });

            test("Label buffer times are exact (new results due to criterion)", () => {
              for (let k = 0; k < 1; ++k) expect(journeysFromCriteria[k].length).toBe(0);
              expect(journeysFromCriteria[1]?.length).toBe(1);
              expect(journeysFromCriteria[1][0][0].label.value("bufferTime")).toBe(-Infinity);
              expect(journeysFromCriteria[1][0].at(-1)?.label.value("bufferTime")).toBe(-2);

              expect(journeysFromCriteria[2]?.length).toBe(1);
              expect(journeysFromCriteria[2][0][0].label.value("bufferTime")).toBe(-Infinity);
              expect(journeysFromCriteria[2][0].at(-1)?.label.value("bufferTime")).toBe(-1);
              for (let k = 3; k < journeysFromCriteria.length; ++k) expect(journeysFromCriteria[k].length).toBe(0);
            });
          },
        },
        {
          params: twoLines[1].withFastTransfers.tests[1].params,
          validate: (res) => {
            validateWithoutCriteria(twoLines[1].withFastTransfers.data[0], twoLines[1].withFastTransfers.tests[1].validate)(res);
            test("Label buffer times are exact", () => {
              expect(res[1]?.[0].at(-1)?.label.value("bufferTime")).toBe(-0);
              expect(res[2]?.[0].at(-1)?.label.value("bufferTime")).toBe(-0);
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
          validate: (res) => {
            const [journeysWithoutCriteria, journeysFromCriteria] = validateWithoutCriteria(
              twoLines[1].withMandatoryTransfer.data[0],
              twoLines[1].withMandatoryTransfer.tests[0].validate,
            )(res);
            test("Label buffer times are exact (same results as RAPTOR)", () => {
              expect(journeysWithoutCriteria[2][0]?.[0].label.value("bufferTime")).toBe(-Infinity);
              expect(journeysWithoutCriteria[2][0]?.[1].label.value("bufferTime")).toBe(-1);
              expect(journeysWithoutCriteria[2][0]?.[2].label.value("bufferTime")).toBe(-1);
              expect(journeysWithoutCriteria[2][0]?.[3].label.value("bufferTime")).toBe(-1);
            });

            test("Label buffer times are exact (new results due to criterion)", () => {
              for (let k = 0; k < 2; ++k) expect(journeysFromCriteria[k].length).toBe(0);
              expect(journeysFromCriteria[2]?.length).toBe(1);
              expect(journeysFromCriteria[2][0][0].label.value("bufferTime")).toBe(-Infinity);
              expect(journeysFromCriteria[2][0].at(-1)?.label.value("bufferTime")).toBe(-2);
              for (let k = 3; k < journeysFromCriteria.length; ++k) expect(journeysFromCriteria[k].length).toBe(0);
            });
          },
        },
      ],
    },
  },
] satisfies McTestDataset<number, number, [[number, "bufferTime"]]>;
