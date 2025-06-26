import { expect, test } from "@jest/globals";
import { Journey } from "../../src/main";
import { McTestAsset, McTestDataset, TestAsset } from "./asset";
import oneLine, { footValidate } from "./oneLine";

const validateWithoutCriteria =
  (validate: TestAsset["tests"][number]["validate"]) => (res: Parameters<McTestAsset<string[]>["tests"][number]["validate"]>[0]) => {
    // No foot transfer: should not change anything
    for (const journeys of res) expect(journeys?.length ?? 1).toBe(1);
    const singleResults = res.map((journeys) => (journeys ? journeys[0] : journeys));

    validate(singleResults as Parameters<TestAsset["tests"][number]["validate"]>[0]);
  };

export default [
  "Foot distance, one line",
  {
    withoutTransfers: {
      data: oneLine[1].withoutTransfers.data,
      tests: [
        {
          params: oneLine[1].withoutTransfers.tests[0].params,
          validate: (res) => {
            validateWithoutCriteria(oneLine[1].withoutTransfers.tests[0].validate)(res);
            test("Label foot distances are exact", () => {
              for (const journeys of res) if (journeys?.[0]) expect(journeys[0].at(-1)?.label.value("footDistance")).toBe(0);
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
          validate: (res) => {
            validateWithoutCriteria(oneLine[1].withSlowTransfers.tests[0].validate);
            test("Label foot distances are exact", () => {
              for (const journeys of res) if (journeys?.[0]) expect(journeys[0].at(-1)?.label.value("footDistance")).toBe(0);
            });
          },
        },
        {
          params: oneLine[1].withSlowTransfers.tests[1].params,
          validate: (res) => {
            validateWithoutCriteria(oneLine[1].withSlowTransfers.tests[1].validate);
            test("Label foot distances are exact", () => {
              for (const journeys of res) if (journeys?.[0]) expect(journeys[0].at(-1)?.label.value("footDistance")).toBe(0);
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
          validate: (res) => {
            const baseJourneys: Parameters<McTestAsset<["footDistance"]>["tests"][number]["validate"]>[0] = res.map((journeys) => {
              if (!journeys) return journeys;

              journeys = journeys.filter((j) => j.length === 2);

              return journeys;
            });
            test("Base results are present", () => {
              expect(baseJourneys.every((journeys) => (journeys?.length ?? 1) === 1)).toBe(true);
            });

            validateWithoutCriteria(oneLine[1].withoutTransfers.tests[0].validate)(baseJourneys);
            test("Label foot distances are exact (same results as RAPTOR)", () => {
              for (const journeys of baseJourneys) if (journeys?.[0]) expect(journeys[0].at(-1)?.label.value("footDistance")).toBe(0);
            });

            test("Label foot distances are exact (results due to criteria)", () => {
              for (const i of [1, 2]) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const journeys = res[i]!.filter((journey) => journey.length === 3);
                expect(journeys.length).toBe(1);

                const journey = journeys[0];

                footValidate(journey as unknown as Journey<number, number, []>);

                expect(journey[1].label.value("footDistance")).toBe(0);
                expect(journey[2].label.value("footDistance")).toBe(1);
              }
            });
          },
        },
      ],
    },
  },
] satisfies McTestDataset<["footDistance"]>;

export { validateWithoutCriteria };
