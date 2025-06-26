/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, test } from "@jest/globals";
import { FootPath, Journey } from "../../src/main";
import { TestAsset, TestDataset } from "./asset";

const MAX_ROUNDS = 6;
const PARAMS: TestAsset["tests"][number]["params"] = [1, 4, 0, { walkSpeed: 1 }, MAX_ROUNDS];

const baseValidate: TestAsset["tests"][number]["validate"] = (res) => {
  test("Run result is exact (generic)", () => {
    expect(res[0]).toBe(null);
    for (let i = 2; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
    const journey = res[1]!;
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

const footValidate = (journey: Journey<number, number, []>) => {
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

/**
 * 1 route with 4 stops and 2 trips
 */
export default [
  "One line",
  {
    withoutTransfers: {
      data: [
        [
          { id: 1, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
          { id: 2, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
          { id: 3, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
          { id: 4, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
        ],
        [
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
        ],
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
        [
          {
            id: 1,
            connectedRoutes: [1],
            transfers: [
              // Not better
              { to: 2, length: 3 },
              { to: 3, length: 5 },
              // Dumb
              { to: 1, length: 1 },
            ] as FootPath<number>[],
          },
          {
            id: 2,
            connectedRoutes: [1],
            transfers: [
              // Not better
              { to: 4, length: 5 },
            ] as FootPath<number>[],
          },
          {
            id: 3,
            connectedRoutes: [1],
            transfers: [
              // Going back
              { to: 2, length: 1 },
            ] as FootPath<number>[],
          },
          { id: 4, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
        ],
        [
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
        ],
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
              expect(res[0]).toBe(null);
              for (let i = 0; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
            });
          },
        },
      ],
    },
    withFastTransfers: {
      data: [
        [
          {
            id: 1,
            connectedRoutes: [1],
            transfers: [
              // OK at k=0
              { to: 4, length: 10 },
              // Not better
              { to: 2, length: 3 },
              { to: 3, length: 5 },
              // Dumb
              { to: 1, length: 1 },
            ] as FootPath<number>[],
          },
          {
            id: 2,
            connectedRoutes: [1],
            transfers: [
              // Not better
              { to: 4, length: 5 },
            ] as FootPath<number>[],
          },
          {
            id: 3,
            connectedRoutes: [1],
            transfers: [
              // Better!
              { to: 4, length: 1 },
              // Not better, going back
              { to: 1, length: 1 },
            ] as FootPath<number>[],
          },
          { id: 4, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
        ],
        [
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
        ],
      ],
      tests: [
        {
          params: PARAMS,
          validate: (res) => {
            test("Direct foot path", () => {
              const footOnly = res[0]!;
              expect(footOnly.length).toBe(2);

              const js0 = footOnly[0];
              expect(Object.keys(js0).length).toBe(2);
              expect(Object.keys(js0)).toContain("compare");
              expect(Object.keys(js0)).toContain("label");
              expect(js0.label.time).toBe(0);

              const js1 = footOnly[1];
              expect(Object.keys(js1).length).toEqual(4);
              expect(js1.label.time).toBe(10);

              if (!("transfer" in js1)) throw new Error("First journey step isn't FOOT");

              expect(js1.boardedAt).toBe(1);
              expect(js1.transfer.to).toBe(4);
              expect(js1.transfer.length).toBe(10);
            });
            test("Run result is exact", () => {
              footValidate(res[1]!);
              for (let i = 2; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
            });
          },
        },
      ],
    },
  },
] satisfies TestDataset;

export { MAX_ROUNDS };
