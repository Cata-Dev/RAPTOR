import { expect, test } from "@jest/globals";
import { Journey, TimeScal } from "../../src";
import { TestAsset, TestDataset } from "./asset";

const MAX_ROUNDS = 6;
const PARAMS = [1, 4, 0, { walkSpeed: 1 * 1_000, maxTransferLength: 100 }, MAX_ROUNDS] satisfies TestAsset<number>["tests"][number]["params"];

const baseValidate: TestAsset<number>["tests"][number]["validate"] = (res) => {
  test("Run result is exact (generic)", () => {
    expect(res[0]).toEqual([]);
    for (let i = 2; i < MAX_ROUNDS; ++i) expect(res[i]).toEqual([]);

    const journey = res[1][0];
    expect(journey.length).toBe(2);

    const js0 = journey[0];
    expect(Object.keys(js0).length).toBe(2);
    expect(Object.keys(js0)).toContain("compare");
    expect(Object.keys(js0)).toContain("label");
    expect(js0.label.time).toBe(0);

    expect(Object.keys(journey[1]).length).toEqual(5);
    expect(journey[1].label.time).toBe(6);

    const js1 = journey[1];
    if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

    expect(js1.boardedAt).toBe(1);
    expect(js1.route.id).toBe(1);
    expect(js1.tripIndex).toBe(0);
  });
};

const footValidate = (journey: Journey<number, number, number, never, []>) => {
  expect(journey.length).toBe(3);

  const js0 = journey[0];
  expect(Object.keys(js0).length).toBe(2);
  expect(Object.keys(js0)).toContain("compare");
  expect(Object.keys(js0)).toContain("label");
  expect(js0.label.time).toBe(0);

  const js1 = journey[1];
  expect(Object.keys(js1).length).toEqual(5);
  expect(js1.label.time).toBe(4);

  if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

  expect(js1.boardedAt).toBe(1);
  expect(js1.route.id).toBe(1);
  expect(js1.tripIndex).toBe(0);

  const js2 = journey[2];
  expect(Object.keys(js2).length).toEqual(4);
  expect(js2.label.time).toBe(5);

  if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

  expect(js2.boardedAt).toBe(3);
  expect(js2.transfer.to).toBe(4);
  expect(js2.transfer.length).toBe(1);
};

const routes: TestAsset<number>["data"][2] = [
  [
    1,
    [1, 2, 3, 4],
    [
      {
        id: 1,
        times: [
          [0, 0],
          [2, 2],
          [4, 4],
          [6, 6],
        ],
      },
      {
        id: 2,
        times: [
          [3, 3],
          [5, 5],
          [7, 7],
          [9, 9],
        ],
      },
    ],
  ],
];

/**
 * 1 route with 4 stops and 2 trips
 */
export default [
  "One line",
  {
    withoutTransfers: {
      data: [
        TimeScal,
        [
          [1, [1], []],
          [2, [1], []],
          [3, [1], []],
          [4, [1], []],
        ],
        routes,
      ],
      tests: [
        {
          params: PARAMS,
          validate: baseValidate,
        },
      ],
    },
    withSlowTransfers: {
      data: [
        TimeScal,
        [
          [
            1,
            [1],
            [
              // Not better
              { to: 2, length: 3 },
              { to: 3, length: 5 },
              // Dumb
              { to: 1, length: 1 },
            ],
          ],
          [
            2,
            [1],
            [
              // Not better
              { to: 4, length: 5 },
            ],
          ],
          [
            3,
            [1],
            [
              // Going back
              { to: 2, length: 1 },
            ],
          ],
          [4, [1], []],
        ],
        routes,
      ],
      tests: [
        {
          params: PARAMS,
          validate: baseValidate,
        },
        {
          params: [PARAMS[0], PARAMS[1], 4, PARAMS[3], PARAMS[4]],
          validate: (res) => {
            test("Run result is exact (late departure)", () => {
              expect(res[0]).toEqual([]);
              for (let i = 0; i < MAX_ROUNDS; ++i) expect(res[i]).toEqual([]);
            });
          },
        },
      ],
    },
    withFastTransfers: {
      data: [
        TimeScal,
        [
          [
            1,
            [1],
            [
              // Better but ignored
              { to: 3, length: 3 },
              // Not better
              { to: 2, length: 3 },
              { to: 3, length: 5 },
              // Dumb
              { to: 1, length: 1 },
            ],
          ],
          [
            2,
            [1],
            [
              // Not better
              { to: 4, length: 5 },
            ],
          ],
          [
            3,
            [1],
            [
              // Better!
              { to: 4, length: 1 },
              // Not better, going back
              { to: 1, length: 1 },
            ],
          ],
          [4, [1], []],
        ],
        routes,
      ],
      tests: [
        {
          params: PARAMS,
          validate: (res) => {
            test("Run result is exact", () => {
              expect(res[0]).toEqual([]);

              footValidate(res[1][0]);
              for (let i = 2; i < MAX_ROUNDS; ++i) expect(res[i]).toEqual([]);
            });
          },
        },
      ],
    },
  },
] satisfies TestDataset<number>;

export { MAX_ROUNDS };
