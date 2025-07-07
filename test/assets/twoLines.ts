/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "@jest/globals";
import { FootPath, Journey } from "../../src";
import { TestAsset, TestDataset } from "./asset";

const MAX_ROUNDS = 6;
const PARAMS: TestAsset["tests"][number]["params"] = [1, 7, 0, { walkSpeed: 1 * 1_000, maxTransferLength: 100 }, MAX_ROUNDS];

const baseValidateN = (journey: Journey<number, number, []> | null) => {
  test("Run result is exact (generic null)", () => {
    expect(journey).toBe(null);
  });
};

const baseValidateVV = (journey: Journey<number, number, []>) => {
  test("Run result is exact (generic VEHICLE+VEHICLE)", () => {
    expect(journey.length).toBe(3);

    const js0 = journey[0];
    expect(Object.keys(js0).length).toBe(2);
    expect(Object.keys(js0)).toContain("compare");
    expect(Object.keys(js0)).toContain("label");
    expect(js0.label.time).toBe(0);

    expect(Object.keys(journey[1]).length).toEqual(5);
    expect(journey[1].label.time).toBe(4);

    const js1 = journey[1];
    if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

    expect(js1.boardedAt).toBe(1);
    expect(js1.route.id).toBe(1);
    expect(js1.tripIndex).toBe(0);

    expect(Object.keys(journey[2]).length).toEqual(5);
    expect(journey[2].label.time).toBe(10);

    const js2 = journey[2];
    if (!("route" in js2)) throw new Error("Second journey step isn't VEHICLE");

    expect(js2.boardedAt).toBe(3);
    expect(js2.route.id).toBe(2);
    expect(js2.tripIndex).toBe(1);
  });
};

const baseValidateVF = (journey: Journey<number, number, []>) => {
  test("Run result is exact (generic VEHICLE+FOOT)", () => {
    expect(journey.length).toBe(3);

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

    expect(Object.keys(journey[2]).length).toEqual(4);
    expect(journey[2].label.time).toBe(11);

    const js2 = journey[2];
    if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

    expect(js2.boardedAt).toBe(4);
    expect(js2.transfer.to).toBe(7);
    expect(js2.transfer.length).toBe(5);
  });
};

const routes: TestAsset["data"][1] = [
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
];

/**
 * 2 routes with 4 stops and 2 trips each
 */
export default [
  "Two lines",
  {
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
        routes,
      ],
      tests: [
        {
          params: PARAMS,
          validate: (res) => {
            for (let i = 0; i < 2; ++i) baseValidateN(res[i]);
            baseValidateVV(res[2]!);
            for (let i = 3; i < MAX_ROUNDS; ++i) baseValidateN(res[i]);
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
        routes,
      ],
      tests: [
        {
          params: PARAMS,
          validate: (res) => {
            for (let i = 0; i < 1; ++i) baseValidateN(res[i]);
            baseValidateVF(res[1]!);
            baseValidateVV(res[2]!);
            for (let i = 3; i < MAX_ROUNDS; ++i) baseValidateN(res[i]);
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
        routes,
      ],
      tests: [
        {
          params: PARAMS,
          validate: (res) => {
            for (let i = 0; i < 1; ++i) baseValidateN(res[i]);
            describe("Run result is exact, early departure", () => {
              baseValidateVF(res[1]!);
              test("k=2", () => {
                const journey = res[2]!;
                expect(journey.length).toBe(4);

                const js0 = journey[0];
                expect(Object.keys(js0).length).toBe(2);
                expect(Object.keys(js0)).toContain("compare");
                expect(Object.keys(js0)).toContain("label");
                expect(js0.label.time).toBe(0);

                expect(Object.keys(journey[1]).length).toEqual(5);
                expect(journey[1].label.time).toBe(2);

                const js1 = journey[1];
                if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

                expect(js1.boardedAt).toBe(1);
                expect(js1.route.id).toBe(1);
                expect(js1.tripIndex).toBe(0);

                expect(Object.keys(journey[2]).length).toEqual(4);
                expect(journey[2].label.time).toBe(5);

                const js2 = journey[2];
                if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

                expect(js2.boardedAt).toBe(2);
                expect(js2.transfer.to).toBe(6);
                expect(js2.transfer.length).toBe(3);

                expect(Object.keys(journey[3]).length).toEqual(5);
                expect(journey[3].label.time).toBe(7);

                const js3 = journey[3];
                if (!("route" in js3)) throw new Error("Second journey step isn't VEHICLE");

                expect(js3.boardedAt).toBe(6);
                expect(js3.route.id).toBe(2);
                expect(js3.tripIndex).toBe(0);
              });
            });
            for (let i = 3; i < MAX_ROUNDS; ++i) baseValidateN(res[i]);
          },
        },
        {
          params: [PARAMS[0], PARAMS[1], 2, PARAMS[3], PARAMS[4]],
          validate: (res) => {
            for (let i = 0; i < 1; ++i) baseValidateN(res[i]);
            for (let i = 3; i < MAX_ROUNDS; ++i) baseValidateN(res[i]);
            test("Run result is exact, late departure", () => {
              const j1 = res[1]!;
              expect(j1.length).toBe(3);

              const j1js0 = j1[0];
              expect(Object.keys(j1js0).length).toBe(2);
              expect(Object.keys(j1js0)).toContain("compare");
              expect(Object.keys(j1js0)).toContain("label");
              expect(j1js0.label.time).toBe(2);

              expect(Object.keys(j1[1]).length).toEqual(5);
              expect(j1[1].label.time).toBe(8);

              const j1js1 = j1[1];
              if (!("route" in j1js1)) throw new Error("First journey step isn't VEHICLE");

              expect(j1js1.boardedAt).toBe(1);
              expect(j1js1.route.id).toBe(1);
              expect(j1js1.tripIndex).toBe(1);

              expect(Object.keys(j1[2]).length).toEqual(4);
              expect(j1[2].label.time).toBe(13);

              const j1js2 = j1[2];
              if (!("transfer" in j1js2)) throw new Error("Second journey step isn't FOOT");

              expect(j1js2.boardedAt).toBe(4);
              expect(j1js2.transfer.to).toBe(7);
              expect(j1js2.transfer.length).toBe(5);

              const j2 = res[2]!;
              expect(j2.length).toBe(3);

              const j2js0 = j2[0];
              expect(Object.keys(j2js0).length).toBe(2);
              expect(Object.keys(j2js0)).toContain("compare");
              expect(Object.keys(j2js0)).toContain("label");
              expect(j2js0.label.time).toBe(2);

              expect(Object.keys(j2[1]).length).toEqual(5);
              expect(j2[1].label.time).toBe(6);

              const j2js1 = j2[1];
              if (!("route" in j2js1)) throw new Error("First journey step isn't VEHICLE");

              expect(j2js1.boardedAt).toBe(1);
              expect(j2js1.route.id).toBe(1);
              expect(j2js1.tripIndex).toBe(1);

              expect(Object.keys(j2[2]).length).toEqual(5);
              expect(j2[2].label.time).toBe(10);

              const j2js2 = j2[2];
              if (!("route" in j2js2)) throw new Error("Second journey step isn't VEHICLE");

              expect(j2js2.boardedAt).toBe(3);
              expect(j2js2.route.id).toBe(2);
              expect(j2js2.tripIndex).toBe(1);
            });
          },
        },
      ],
    },
    withMandatoryTransfer: {
      data: [
        [
          { id: 1, connectedRoutes: [1], transfers: [] },
          { id: 2, connectedRoutes: [1], transfers: [] },
          { id: 3, connectedRoutes: [1], transfers: [{ to: 4, length: 5 }] },
          { id: 4, connectedRoutes: [2], transfers: [] },
          { id: 5, connectedRoutes: [2], transfers: [] },
          { id: 6, connectedRoutes: [2], transfers: [] },
        ],
        [
          [
            1,
            [1, 2, 3],
            [
              {
                id: 1,
                times: [
                  [1, 1],
                  [3, 3],
                  [5, 5],
                ],
              },
              {
                id: 2,
                times: [
                  [4, 4],
                  [6, 6],
                  [8, 8],
                ],
              },
            ],
          ],
          [
            2,
            [4, 5, 6],
            [
              {
                id: 1,
                times: [
                  [11, 11],
                  [13, 13],
                  [15, 15],
                ],
              },
              {
                id: 2,
                times: [
                  [15, 15],
                  [17, 17],
                  [19, 19],
                ],
              },
            ],
          ],
        ],
      ],
      tests: [
        {
          params: [1, 6, 0, PARAMS[3], PARAMS[4]] as typeof PARAMS,
          validate: (res) => {
            for (let i = 0; i < 2; ++i) baseValidateN(res[i]);
            test("2 trips witch a mandatory foot transfer", () => {
              const journey = res[2]!;

              expect(journey.length).toBe(4);

              const js0 = journey[0];
              expect(Object.keys(js0).length).toBe(2);
              expect(Object.keys(js0)).toContain("compare");
              expect(Object.keys(js0)).toContain("label");
              expect(js0.label.time).toBe(0);

              const js1 = journey[1];
              expect(Object.keys(js1).length).toEqual(5);
              expect(js1.label.time).toBe(5);
              if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");
              expect(js1.boardedAt).toBe(1);
              expect(js1.route.id).toBe(1);
              expect(js1.tripIndex).toBe(0);

              const js2 = journey[2];
              expect(Object.keys(js2).length).toEqual(4);
              expect(js2.label.time).toBe(10);
              if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");
              expect(js2.boardedAt).toBe(3);
              expect(js2.transfer.to).toBe(4);
              expect(js2.transfer.length).toBe(5);

              const js3 = journey[3];
              expect(Object.keys(js3).length).toEqual(5);
              expect(js3.label.time).toBe(15);
              if (!("route" in js3)) throw new Error("Third journey step isn't VEHICLE");
              expect(js3.boardedAt).toBe(4);
              expect(js3.route.id).toBe(2);
              expect(js3.tripIndex).toBe(0);
            });
            for (let i = 3; i < MAX_ROUNDS; ++i) baseValidateN(res[i]);
          },
        },
      ],
    },
  },
] satisfies TestDataset;

export { MAX_ROUNDS };
