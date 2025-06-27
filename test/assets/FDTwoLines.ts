/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, test } from "@jest/globals";
import { McTestDataset } from "./asset";
import { validateWithoutCriteria } from "./FDOneLine";
import twoLines from "./twoLines";

export default [
  "Foot distance, two lines",
  {
    withoutTransfers: {
      data: twoLines[1].withoutTransfers.data,
      tests: [
        {
          params: twoLines[1].withoutTransfers.tests[0].params,
          validate: (res) => {
            validateWithoutCriteria(twoLines[1].withoutTransfers.tests[0].validate)(res);
            for (const journeys of res) expect(journeys?.length ?? 1).toBe(1);
            test("Label foot distances are exact", () => {
              for (const journeys of res) if (journeys?.[0]) expect(journeys[0].at(-1)?.label.value("footDistance")).toBe(0);
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
            for (const journeys of res) expect(journeys?.length ?? 1).toBe(1);
            test("Label foot distances are exact", () => {
              for (const journey of res[1]!) expect(journey.at(-1)?.label.value("footDistance")).toBe(5);
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
            const [journeysWithoutCriteria, journeysFromCriteria] = validateWithoutCriteria(twoLines[1].withFastTransfers.tests[0].validate)(res);
            test("Label foot distances are exact (same results as RAPTOR)", () => {
              expect(journeysWithoutCriteria[1]?.at(-1)?.label.value("footDistance")).toBe(5);
              expect(journeysWithoutCriteria[2]?.at(-1)?.label.value("footDistance")).toBe(3);
            });
            });
          },
        },
        {
          params: twoLines[1].withFastTransfers.tests[1].params,
          validate: (res) => {
            validateWithoutCriteria(twoLines[1].withFastTransfers.tests[1].validate)(res);
            for (const journeys of res) expect(journeys?.length ?? 1).toBe(1);
            test("Label foot distances are exact", () => {
              for (const journey of res[1]!) expect(journey.at(-1)?.label.value("footDistance")).toBe(5);
              for (const journey of res[2]!) expect(journey.at(-1)?.label.value("footDistance")).toBe(0);
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
            validateWithoutCriteria(twoLines[1].withMandatoryTransfer.tests[0].validate)(res);
            for (const journeys of res) expect(journeys?.length ?? 1).toBe(1);
            test("Label foot distances are exact", () => {
              expect(res[2]![0].at(-1)?.label.value("footDistance")).toBe(5);
            });
          },
        },
      ],
    },
  },
] satisfies McTestDataset<["footDistance"]>;
