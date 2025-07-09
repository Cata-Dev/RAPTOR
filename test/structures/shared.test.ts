import { describe, expect, test } from "@jest/globals";
import { SharedRAPTORData, sharedTimeScal } from "../../src";
import twoLines from "../assets/twoLines";

const [_, stops, routes] = twoLines[1].withFastTransfers.data;

describe("SharedRAPTORData class", () => {
  describe("Default instantiation", () => {
    const SharedRAPTORDataInst = SharedRAPTORData.makeFromRawData(sharedTimeScal, stops, routes);

    const sharedStops = Array.from(SharedRAPTORDataInst.stops).sort(([_, a], [__, b]) => (a.id as number) - (b.id as number));
    const sharedRoutes = Array.from(SharedRAPTORDataInst.routes).sort(([_, a], [__, b]) => (a.id as number) - (b.id as number));

    test("All stops are present", () => {
      for (const stop of stops.sort((a, b) => a.id - b.id)) {
        expect(sharedStops.find(([_, sharedStop]) => sharedStop.id === stop.id)).not.toBe(undefined);

        const stopPtr = SharedRAPTORDataInst.stopPointerFromId(stop.id);
        if (stopPtr === undefined) throw new Error("Unexpected result");
        const sharedStop = SharedRAPTORDataInst.stops.get(stopPtr);
        if (sharedStop === undefined) throw new Error("Unexpected result");
        expect(sharedStop.id).toBe(stop.id);
      }
    });

    test("All routes are present", () => {
      for (const [id] of Array.from(routes).sort(([idA], [idB]) => idA - idB)) {
        expect(sharedRoutes.find(([_, sharedRoute]) => sharedRoute.id === id)).not.toBe(undefined);

        const routePtr = SharedRAPTORDataInst.routePointerFromId(id);
        if (routePtr === undefined) throw new Error("Unexpected result");
        const sharedRoute = SharedRAPTORDataInst.routes.get(routePtr);
        if (sharedRoute === undefined) throw new Error("Unexpected result");
        expect(sharedRoute.id).toBe(id);
      }
    });
  });

  describe("From internal data instantiation", () => {
    //
  });
});
