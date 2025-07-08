import { describe, expect, test } from "@jest/globals";
import { RAPTORData, Route } from "../src";
import BaseRAPTOR from "../src/base";

describe("Base RAPTOR should not be usable", () => {
  const raptorData = new RAPTORData([], []);
  const raptorInstance = new BaseRAPTOR(raptorData);

  test("Run should throw", () => {
    expect(() => {
      raptorInstance.run(0, 0, 0, { walkSpeed: 0, maxTransferLength: Infinity });
    }).toThrow("Not implemented");
  });

  test("Unimplemented methods should throw", () => {
    expect(() => {
      (raptorInstance as unknown as { beginRound: BaseRAPTOR["beginRound"] }).beginRound();
    }).toThrow("Not implemented");

    expect(() => {
      (raptorInstance as unknown as { traverseRoute: BaseRAPTOR["traverseRoute"] }).traverseRoute(new Route(0, [], []), 0);
    }).toThrow("Not implemented");

    expect(() => {
      (raptorInstance as unknown as { traverseFootPaths: BaseRAPTOR["traverseFootPaths"] }).traverseFootPaths(0, {
        id: 0,
        connectedRoutes: [],
        transfers: [],
      });
    }).toThrow("Not implemented");
  });
});
