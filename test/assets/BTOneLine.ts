import { expect, test } from "@jest/globals";
import { McTestAsset, McTestDataset } from "./asset";
import oneLine, { MAX_ROUNDS } from "./oneLine";
import { validateWithoutCriteria } from "./FDOneLine";

export default [
  "Buffer time, one line",
  {
    withoutTransfers: {
      data: oneLine[1].withoutTransfers.data,
      tests: [
        {
          params: oneLine[1].withoutTransfers.tests[0].params,
          validate: (res) => {
            validateWithoutCriteria(oneLine[1].withoutTransfers.tests[0].validate)(res);
            test("Label buffer times are exact", () => {
              for (const journeys of res)
                if (journeys?.[0]) {
                  expect(journeys[0][0].label.value("bufferTime")).toBe(Infinity);
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  expect(journeys[0].at(-1)!.label.value("bufferTime")).toBe(-0);
                }
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
            test("Label buffer times are exact", () => {
              for (const journeys of res)
                if (journeys?.[0]) {
                  expect(journeys[0][0].label.value("bufferTime")).toBe(Infinity);
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  expect(journeys[0].at(-1)!.label.value("bufferTime")).toBe(-0);
                }
            });
          },
        },
        {
          params: oneLine[1].withSlowTransfers.tests[1].params,
          validate: (res) => {
            validateWithoutCriteria(oneLine[1].withSlowTransfers.tests[1].validate);
            test("Label buffer times are exact", () => {
              for (const journeys of res)
                if (journeys?.[0]) {
                  expect(journeys[0][0].label.value("bufferTime")).toBe(Infinity);
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  expect(journeys[0].at(-1)!.label.value("bufferTime")).toBe(-0);
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
          validate: (res) => {
            test("Run result is exact (mid departure, buffer time > 0)", () => {
              expect(res[0]).toBe(null);
              for (let i = 2; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
              expect(res[1]?.length).toBe(1);
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const journey = res[1]![0];

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
          validate: (res) => {
            const journeys: Parameters<McTestAsset<["bufferTime"]>["tests"][number]["validate"]>[0] = res.map((journeys) => {
              if (!journeys) return journeys;

              journeys = journeys.filter((j) => j.length === 3);

              return journeys;
            });
            test("Base results are present", () => {
              expect(journeys.every((journeys) => (journeys?.length ?? 1) === 1)).toBe(true);
            });
            validateWithoutCriteria(oneLine[1].withFastTransfers.tests[0].validate)(journeys);

            test("Label buffer times are exact", () => {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const journeys = res[1]!.filter((journey) => journey.length === 3);
              expect(journeys.length).toBe(1);

              const journey = journeys[0];

              expect(journey[1].label.value("bufferTime")).toBe(-0);
              expect(journey[2].label.value("bufferTime")).toBe(-0);
            });
          },
        },
      ],
    },
  },
] satisfies McTestDataset<["bufferTime"]>;
