import { expect, test } from "@jest/globals";
import { Journey } from "../../src/main";
import { McTestAsset, McTestDataset, TestAsset } from "./asset";
import oneLine, { footValidate } from "./oneLine";

const baseValidate = (validate: TestAsset["tests"][number]["validate"]) =>
  ((res) => {
    // No foot transfer: should not change anything
    for (const journeys of res) expect(journeys?.length ?? 1).toBe(1);
    const singleResults = res.map((journeys) => (journeys ? journeys[0] : journeys));

    validate(singleResults as Parameters<TestAsset["tests"][number]["validate"]>[0]);

    test("Foot distances are correct", () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      for (const journey of singleResults) if (journey) expect(journey.at(-1)!.label.value("footDistance")).toBe(0);
    });
  }) as McTestAsset<["footDistance"]>["tests"][number]["validate"];

export default {
  withoutTransfers: {
    data: oneLine.withoutTransfers.data,
    tests: [
      {
        params: oneLine.withoutTransfers.tests[0].params,
        validate: baseValidate(oneLine.withoutTransfers.tests[0].validate),
      },
    ],
  },
  withSlowTransfers: {
    data: oneLine.withSlowTransfers.data,
    tests: [
      {
        params: oneLine.withSlowTransfers.tests[0].params,
        validate: baseValidate(oneLine.withSlowTransfers.tests[0].validate),
      },
      {
        params: oneLine.withSlowTransfers.tests[1].params,
        validate: baseValidate(oneLine.withSlowTransfers.tests[1].validate),
      },
    ],
  },
  withFastTransfers: {
    data: oneLine.withFastTransfers.data,
    tests: [
      {
        params: oneLine.withFastTransfers.tests[0].params,
        validate: (res) => {
          const baseJourneys: Parameters<McTestAsset<["footDistance"]>["tests"][number]["validate"]>[0] = res.map((journeys) => {
            if (!journeys) return journeys;

            journeys = journeys.filter((j) => j.length === 2);

            return journeys;
          });
          test("Base results are present", () => {
            expect(baseJourneys.every((journeys) => (journeys?.length ?? 1) === 1));
          });

          baseValidate(oneLine.withoutTransfers.tests[0].validate)(baseJourneys);

          test("Criteria-specific results are exact", () => {
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
} satisfies McTestDataset<["footDistance"]>;
