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
            test("Label foot distances are exact", () => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
            validateWithoutCriteria(twoLines[1].withFastTransfers.tests[0].validate)(res);
            test("Label foot distances are exact", () => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              for (const journey of res[1]!) expect(journey.at(-1)?.label.value("footDistance")).toBe(5);
            });
          },
        },
        {
          params: twoLines[1].withFastTransfers.tests[1].params,
          validate: (res) => {
            validateWithoutCriteria(twoLines[1].withFastTransfers.tests[1].validate)(res);
          },
        },
      ],
    },
  },
] satisfies McTestDataset<["footDistance"]>;
