/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect, test } from "@jest/globals";
import { FootPath } from "../../src/main";
import { TestAsset, TestDataset } from "./asset";
import { describe } from "node:test";

const MAX_ROUNDS = 6;
const PARAMS: TestAsset["tests"][number]["params"] = [1, 7, 0, { walkSpeed: 1 }, MAX_ROUNDS];

const baseValidate234: TestAsset["tests"][number]["validate"] = (res) => {
  test("Run result is exact (generic k=2,3,4...)", () => {
    for (let i = 4; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
    for (const i of [2, 3]) {
      expect(res[i]!.length).toBe(3);

      const js0 = res[i]![0];
      expect(Object.keys(js0).length).toBe(2);
      expect(Object.keys(js0)).toContain("compare");
      expect(Object.keys(js0)).toContain("label");
      expect(js0.label.time).toBe(0);

      expect(Object.keys(res[i]![1]).length).toEqual(5);
      expect(res[i]![1].label.time).toBe(4);

      const js1 = res[i]![1];
      if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

      expect(js1.boardedAt).toBe(1);
      expect(js1.route.id).toBe(1);
      expect(js1.tripIndex).toBe(0);

      expect(Object.keys(res[i]![2]).length).toEqual(5);
      expect(res[i]![2].label.time).toBe(10);

      const js2 = res[i]![2];
      if (!("route" in js2)) throw new Error("Second journey step isn't VEHICLE");

      expect(js2.boardedAt).toBe(3);
      expect(js2.route.id).toBe(2);
      expect(js2.tripIndex).toBe(1);
    }
  });
};

const baseValidate1: TestAsset["tests"][number]["validate"] = (res) => {
  test("Run result is exact (generic k=0,1)", () => {
    for (let i = 0; i < 1; ++i) expect(res[i]).toBe(null);
    for (const i of [1]) {
      expect(res[i]!.length).toBe(3);

      const js0 = res[i]![0];
      expect(Object.keys(js0).length).toBe(2);
      expect(Object.keys(js0)).toContain("compare");
      expect(Object.keys(js0)).toContain("label");
      expect(js0.label.time).toBe(0);

      expect(Object.keys(res[i]![1]).length).toEqual(5);
      expect(res[i]![1].label.time).toBe(6);

      const js1 = res[i]![1];
      if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

      expect(js1.boardedAt).toBe(1);
      expect(js1.route.id).toBe(1);
      expect(js1.tripIndex).toBe(0);

      expect(Object.keys(res[i]![2]).length).toEqual(4);
      expect(res[i]![2].label.time).toBe(11);

      const js2 = res[i]![2];
      if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

      expect(js2.boardedAt).toBe(4);
      expect(js2.transfer.to).toBe(7);
      expect(js2.transfer.length).toBe(5);
    }
  });
};

/**
 * 1 route with 4 stops and 2 trips
 */
export default {
  withoutTransfers: {
    data: [
      [
        { id: 1, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
        { id: 2, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
        { id: 3, connectedRoutes: [1, 2], transfers: [] as FootPath<number>[] },
        { id: 4, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
        { id: 5, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
        { id: 6, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
        { id: 7, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
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
                [2, 2],
                [4, 4],
                [6, 6],
                [8, 8],
              ],
            },
          ],
        ],
        [
          2,
          [5, 3, 6, 7],
          [
            {
              id: 1,
              times: [
                [1, 1],
                [3, 3],
                [5, 5],
                [7, 7],
              ],
            },
            {
              id: 2,
              times: [
                [4, 4],
                [6, 6],
                [8, 8],
                [10, 10],
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
          test("Run result is exact", () => {
            for (let i = 0; i < 2; ++i) expect(res[i]).toBe(null);
          });
          baseValidate234(res);
        },
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
            { to: 3, length: 6 },
            { to: 6, length: 8 },
          ] as FootPath<number>[],
        },
        { id: 2, connectedRoutes: [1], transfers: [] as FootPath<number>[] },
        { id: 3, connectedRoutes: [1, 2], transfers: [] as FootPath<number>[] },
        { id: 4, connectedRoutes: [1], transfers: [{ to: 7, length: 5 }] as FootPath<number>[] },
        { id: 5, connectedRoutes: [2], transfers: [{ to: 2, length: 5 }] as FootPath<number>[] },
        { id: 6, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
        { id: 7, connectedRoutes: [2], transfers: [{ to: 1, length: 10 }] as FootPath<number>[] },
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
                [2, 2],
                [4, 4],
                [6, 6],
                [8, 8],
              ],
            },
          ],
        ],
        [
          2,
          [5, 3, 6, 7],
          [
            {
              id: 1,
              times: [
                [1, 1],
                [3, 3],
                [5, 5],
                [7, 7],
              ],
            },
            {
              id: 2,
              times: [
                [4, 4],
                [6, 6],
                [8, 8],
                [10, 10],
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
          baseValidate1(res);
          baseValidate234(res);
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
            { to: 3, length: 6 },
            { to: 6, length: 8 },
          ] as FootPath<number>[],
        },
        {
          id: 2,
          connectedRoutes: [1],
          transfers: [
            // Better!
            { to: 6, length: 3 },
          ] as FootPath<number>[],
        },
        { id: 3, connectedRoutes: [1, 2], transfers: [] as FootPath<number>[] },
        { id: 4, connectedRoutes: [1], transfers: [{ to: 7, length: 5 }] as FootPath<number>[] },
        { id: 5, connectedRoutes: [2], transfers: [{ to: 2, length: 5 }] as FootPath<number>[] },
        { id: 6, connectedRoutes: [2], transfers: [] as FootPath<number>[] },
        { id: 7, connectedRoutes: [2], transfers: [{ to: 1, length: 10 }] as FootPath<number>[] },
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
                [2, 2],
                [4, 4],
                [6, 6],
                [8, 8],
              ],
            },
          ],
        ],
        [
          2,
          [5, 3, 6, 7],
          [
            {
              id: 1,
              times: [
                [1, 1],
                [3, 3],
                [5, 5],
                [7, 7],
              ],
            },
            {
              id: 2,
              times: [
                [4, 4],
                [6, 6],
                [8, 8],
                [10, 10],
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
          void describe("Run result is exact, early departure", () => {
            baseValidate1(res);
            test("k=2,3,4...", () => {
              for (const i of [2, 3]) {
                expect(res[i]!.length).toBe(4);

                const js0 = res[i]![0];
                expect(Object.keys(js0).length).toBe(2);
                expect(Object.keys(js0)).toContain("compare");
                expect(Object.keys(js0)).toContain("label");
                expect(js0.label.time).toBe(0);

                expect(Object.keys(res[i]![1]).length).toEqual(5);
                expect(res[i]![1].label.time).toBe(2);

                const js1 = res[i]![1];
                if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

                expect(js1.boardedAt).toBe(1);
                expect(js1.route.id).toBe(1);
                expect(js1.tripIndex).toBe(0);

                expect(Object.keys(res[i]![2]).length).toEqual(4);
                expect(res[i]![2].label.time).toBe(5);

                const js2 = res[i]![2];
                if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

                expect(js2.boardedAt).toBe(2);
                expect(js2.transfer.to).toBe(6);
                expect(js2.transfer.length).toBe(3);

                expect(Object.keys(res[i]![3]).length).toEqual(5);
                expect(res[i]![3].label.time).toBe(7);

                const js3 = res[i]![3];
                if (!("route" in js3)) throw new Error("Second journey step isn't VEHICLE");

                expect(js3.boardedAt).toBe(6);
                expect(js3.route.id).toBe(2);
                expect(js3.tripIndex).toBe(0);
              }
            });
          });
        },
      },
      {
        params: [PARAMS[0], PARAMS[1], 2, PARAMS[3], PARAMS[4]],
        validate: (res) => {
          test("Run result is exact, late departure", () => {
            for (let i = 0; i < 1; ++i) expect(res[i]).toBe(null);
            for (let i = 4; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
            for (const i of [1]) {
              expect(res[i]!.length).toBe(3);

              const js0 = res[i]![0];
              expect(Object.keys(js0).length).toBe(2);
              expect(Object.keys(js0)).toContain("compare");
              expect(Object.keys(js0)).toContain("label");
              expect(js0.label.time).toBe(2);

              expect(Object.keys(res[i]![1]).length).toEqual(5);
              expect(res[i]![1].label.time).toBe(8);

              const js1 = res[i]![1];
              if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

              expect(js1.boardedAt).toBe(1);
              expect(js1.route.id).toBe(1);
              expect(js1.tripIndex).toBe(1);

              expect(Object.keys(res[i]![2]).length).toEqual(4);
              expect(res[i]![2].label.time).toBe(13);

              const js2 = res[i]![2];
              if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

              expect(js2.boardedAt).toBe(4);
              expect(js2.transfer.to).toBe(7);
              expect(js2.transfer.length).toBe(5);
            }
            for (const i of [2, 3]) {
              expect(res[i]!.length).toBe(3);

              const js0 = res[i]![0];
              expect(Object.keys(js0).length).toBe(2);
              expect(Object.keys(js0)).toContain("compare");
              expect(Object.keys(js0)).toContain("label");
              expect(js0.label.time).toBe(2);

              expect(Object.keys(res[i]![1]).length).toEqual(5);
              expect(res[i]![1].label.time).toBe(6);

              const js1 = res[i]![1];
              if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

              expect(js1.boardedAt).toBe(1);
              expect(js1.route.id).toBe(1);
              expect(js1.tripIndex).toBe(1);

              expect(Object.keys(res[i]![2]).length).toEqual(5);
              expect(res[i]![2].label.time).toBe(10);

              const js2 = res[i]![2];
              if (!("route" in js2)) throw new Error("Second journey step isn't VEHICLE");

              expect(js2.boardedAt).toBe(3);
              expect(js2.route.id).toBe(2);
              expect(js2.tripIndex).toBe(1);
            }
          });
        },
      },
    ],
  },
} satisfies TestDataset;
