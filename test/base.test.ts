import { describe, expect, test } from "@jest/globals";
import { InternalTimeInt, RAPTORData, Route, Stop, TimeInt, TimeScal } from "../src";
import BaseRAPTOR from "../src/base";

describe("Base RAPTOR should not be usable", () => {
  const raptorData = new RAPTORData(TimeScal, [], []);
  const raptorInstance = new BaseRAPTOR(raptorData);

  test("Run should throw", () => {
    expect(() => {
      raptorInstance.run(0, 0, 0, { walkSpeed: 0, maxTransferLength: Infinity });
    }).toThrow("Not implemented");
  });

  test("Unimplemented methods should throw", () => {
    expect(() => {
      (raptorInstance as unknown as { beginRound: BaseRAPTOR<never>["beginRound"] }).beginRound();
    }).toThrow("Not implemented");

    expect(() => {
      (raptorInstance as unknown as { traverseRoute: BaseRAPTOR<never>["traverseRoute"] }).traverseRoute(new Route(0, [], []), 0);
    }).toThrow("Not implemented");

    expect(() => {
      (raptorInstance as unknown as { traverseFootPaths: BaseRAPTOR<never>["traverseFootPaths"] }).traverseFootPaths(0, new Stop(0, [], []));
    }).toThrow("Not implemented");

    expect(() => {
      (raptorInstance as unknown as { getBestJourneys: BaseRAPTOR<never>["getBestJourneys"] }).getBestJourneys(0);
    }).toThrow("Not implemented");
  });
});

describe("et", () => {
  test("with interval time", () => {
    const raptorData = new RAPTORData<InternalTimeInt, number, number>(
      TimeInt,
      [],
      [
        [
          0,
          [0],
          [
            {
              times: [
                [
                  [0, 0],
                  [0, 3],
                ],
              ],
            },
          ],
        ],
      ],
    );
    const raptorInstance = new BaseRAPTOR(raptorData);

    const route0 = raptorData.routes.get(0);
    if (!route0) throw new Error("Unexpected undefined route from data");

    expect((raptorInstance as unknown as { et: (typeof raptorInstance)["et"] }).et(route0, 0, [0, 0])).toEqual({ boardedAt: 0, tripIndex: 0 });
    expect((raptorInstance as unknown as { et: (typeof raptorInstance)["et"] }).et(route0, 0, [0, 1])).toEqual({ boardedAt: 0, tripIndex: 0 });
    expect((raptorInstance as unknown as { et: (typeof raptorInstance)["et"] }).et(route0, 0, [0, 3])).toEqual({ boardedAt: 0, tripIndex: 0 });
    expect((raptorInstance as unknown as { et: (typeof raptorInstance)["et"] }).et(route0, 0, [1, 3])).toEqual({ boardedAt: 0, tripIndex: 0 });
    expect((raptorInstance as unknown as { et: (typeof raptorInstance)["et"] }).et(route0, 0, [3, 3])).toEqual({ boardedAt: 0, tripIndex: 0 });
    expect((raptorInstance as unknown as { et: (typeof raptorInstance)["et"] }).et(route0, 0, [0, 5])).toEqual({ boardedAt: 0, tripIndex: 0 });
    expect((raptorInstance as unknown as { et: (typeof raptorInstance)["et"] }).et(route0, 0, [2, 5])).toEqual({ boardedAt: 0, tripIndex: 0 });
    expect((raptorInstance as unknown as { et: (typeof raptorInstance)["et"] }).et(route0, 0, [4, 5])).toBe(null);
  });
});
