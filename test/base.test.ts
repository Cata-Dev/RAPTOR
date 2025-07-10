import { describe, expect, test } from "@jest/globals";
import { RAPTORData, Route, TimeScal } from "../src";
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
      (raptorInstance as unknown as { traverseFootPaths: BaseRAPTOR<never>["traverseFootPaths"] }).traverseFootPaths(0, {
        id: 0,
        connectedRoutes: [],
        transfers: [],
      });
    }).toThrow("Not implemented");
  });
});
