import { expect, test } from "@jest/globals";
import { McTestDataset } from "./asset";
import { validateWithoutCriteria } from "./FDOneLine";
import twoLines from "./twoLines";

export default [
  "Buffer time, two lines",
  {
    withoutTransfers: {
      data: twoLines[1].withoutTransfers.data,
      tests: [
        {
          params: twoLines[1].withoutTransfers.tests[0].params,
          validate: (res) => {
            validateWithoutCriteria(twoLines[1].withoutTransfers.tests[0].validate)(res);
            test("Label foot distances are exact", () => {
              expect(res[2]?.[0].at(-1)?.label.value("bufferTime")).toBe(-2);
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
            validateWithoutCriteria(twoLines[1].withSlowTransfers.tests[0].validate)(res);
            test("Label foot distances are exact", () => {
              expect(res[1]?.[0].at(-1)?.label.value("bufferTime")).toBe(-0);
              expect(res[2]?.[0].at(-1)?.label.value("bufferTime")).toBe(-2);
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
            validateWithoutCriteria(twoLines[1].withFastTransfers.tests[0].validate)(res);
            test("Label foot distances are exact", () => {
              expect(res[1]?.[0].at(-1)?.label.value("bufferTime")).toBe(-0);
              expect(res[2]?.[0].at(-1)?.label.value("bufferTime")).toBe(-0);
            });
          },
        },
        {
          params: twoLines[1].withFastTransfers.tests[1].params,
          validate: (res) => {
            validateWithoutCriteria(twoLines[1].withFastTransfers.tests[1].validate)(res);
            test("Label foot distances are exact", () => {
              expect(res[1]?.[0].at(-1)?.label.value("bufferTime")).toBe(-0);
              expect(res[2]?.[0].at(-1)?.label.value("bufferTime")).toBe(-0);
            });
          },
        },
      ],
    },
  },
] satisfies McTestDataset<["bufferTime"]>;
