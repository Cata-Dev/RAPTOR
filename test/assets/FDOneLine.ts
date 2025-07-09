/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, test } from "@jest/globals";
import { Journey, Ordered } from "../../src";
import { McTestAsset, McTestDataset, TestAsset } from "./asset";
import oneLine from "./oneLine";

const validateWithoutCriteria =
  <V extends Ordered<V>, CA extends [V, string][]>(validate: TestAsset["tests"][number]["validate"]) =>
  (res: Parameters<McTestAsset<V, CA>["tests"][number]["validate"]>[0]): [(Journey<number, number, V, CA> | null)[], typeof res] => {
    let bestTime = Infinity;
    const journeysWithoutCriteria = res.map((journeys) => {
      const bestJourney = journeys.length ? Array.from(journeys).sort((a, b) => a.at(-1)!.label.time - b.at(-1)!.label.time)[0] : null;

      const jTime = bestJourney?.at(-1)?.label.time;
      if (jTime !== undefined)
        if (jTime < bestTime) {
          bestTime = jTime;
        } else return null;

      return bestJourney;
    });
    validate(journeysWithoutCriteria as Parameters<TestAsset["tests"][number]["validate"]>[0]);

    return [journeysWithoutCriteria, res.map((journeys, k) => journeys.filter((j) => j !== journeysWithoutCriteria[k]))];
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
            for (const journeys of res) expect(journeys.length || 1).toBe(1);
            test("Label foot distances are exact", () => {
              for (const journeys of res) if (journeys[0]) expect(journeys[0].at(-1)?.label.value("footDistance")).toBe(0);
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
            for (const journeys of res) expect(journeys.length || 1).toBe(1);
            test("Label foot distances are exact", () => {
              for (const journeys of res) if (journeys[0]) expect(journeys[0].at(-1)?.label.value("footDistance")).toBe(0);
            });
          },
        },
        {
          params: oneLine[1].withSlowTransfers.tests[1].params,
          validate: (res) => {
            validateWithoutCriteria(oneLine[1].withSlowTransfers.tests[1].validate);
            for (const journeys of res) expect(journeys.length || 1).toBe(1);
            test("Label foot distances are exact", () => {
              for (const journeys of res) if (journeys[0]) expect(journeys[0].at(-1)?.label.value("footDistance")).toBe(0);
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
            const [journeysWithoutCriteria, journeysFromCriteria] = validateWithoutCriteria(oneLine[1].withFastTransfers.tests[0].validate)(res);

            test("Label foot distances are exact (same results as RAPTOR)", () => {
              for (const [k, journey] of journeysWithoutCriteria.entries())
                if (k === 1) {
                  expect(journey?.[0]?.label.value("footDistance")).toBe(0);
                  expect(journey?.[1]?.label.value("footDistance")).toBe(0);
                  expect(journey?.[2]?.label.value("footDistance")).toBe(1);
                }
            });

            test("Label foot distances are exact (results due to criteria)", () => {
              for (let k = 0; k < 1; ++k) expect(journeysFromCriteria[k]?.length ?? 0).toBe(0);
              expect(journeysFromCriteria[1]?.length).toBe(1);
              for (const js of journeysFromCriteria[1][0]) expect(js.label.value("footDistance")).toBe(0);
              for (let k = 2; k < journeysFromCriteria.length; ++k) expect(journeysFromCriteria[k]?.length ?? 0).toBe(0);
            });
          },
        },
      ],
    },
  },
] satisfies McTestDataset<number, [[number, "footDistance"]]>;

export { validateWithoutCriteria };
