import { describe, expect, test } from "@jest/globals";
import { FootPath, SharedRAPTORData, sharedTimeIntOrderLow, sharedTimeScal, Time } from "../../src";
import { TestAsset } from "../assets/asset";
import twoLines from "../assets/twoLines";

const [timeType, stops, routes] = twoLines[1].withFastTransfers.data;

function testStops<TimeVal>(stops: TestAsset<TimeVal>["data"][1], SharedRAPTORDataInst: SharedRAPTORData<TimeVal>) {
  SharedRAPTORDataInst.secure = true;
  const sharedStops = Array.from(SharedRAPTORDataInst.stops).sort(([_, a], [__, b]) => (a.id as number) - (b.id as number));

  for (const [id, connectedRoutes, transfers] of Array.from(stops).sort(([aId], [bId]) => aId - bId)) {
    const sharedStopFound = sharedStops.find(([_, sharedStop]) => sharedStop.id === id);
    expect(sharedStopFound).not.toBe(undefined);

    const stopPtr = SharedRAPTORDataInst.stopPointerFromId(id);
    if (stopPtr === undefined) throw new Error("Unexpected result");
    const sharedStopGot = SharedRAPTORDataInst.stops.get(stopPtr);
    if (sharedStopGot === undefined) throw new Error("Unexpected result");
    expect(sharedStopGot.id).toBe(id);

    // Connected routes
    expect(sharedStopGot.connectedRoutes.length).toBe(connectedRoutes.length);
    for (const connectedRoute of connectedRoutes) {
      const sharedConnectedRoute = Array.from(sharedStopGot.connectedRoutes).find(
        (sharedConnectedRoute) => SharedRAPTORDataInst.routes.get(sharedConnectedRoute)?.id === connectedRoute,
      );
      expect(sharedConnectedRoute).not.toBe(undefined);
    }

    // Transfers
    expect(sharedStopGot.connectedRoutes.length).toBe(connectedRoutes.length);
    for (const transfer of transfers) {
      const sharedTransfer = Array.from(sharedStopGot.transfers()).find(
        (sharedTransfer) => SharedRAPTORDataInst.stops.get(sharedTransfer.to)?.id === transfer.to && sharedTransfer.length === transfer.length,
      );
      expect(sharedTransfer).not.toBe(undefined);
    }
  }
}

function testRoutes<TimeVal>(timeType: Time<TimeVal>, routes: TestAsset<TimeVal>["data"][2], SharedRAPTORDataInst: SharedRAPTORData<TimeVal>) {
  SharedRAPTORDataInst.secure = true;
  const sharedRoutes = Array.from(SharedRAPTORDataInst.routes).sort(([_, a], [__, b]) => a.id - b.id);

  for (const [id, stops, trips] of Array.from(routes).sort(([idA], [idB]) => idA - idB)) {
    expect(sharedRoutes.find(([_, sharedRoute]) => sharedRoute.id === id)).not.toBe(undefined);

    const routePtr = SharedRAPTORDataInst.routePointerFromId(id);
    if (routePtr === undefined) throw new Error("Unexpected result");
    const sharedRoute = SharedRAPTORDataInst.routes.get(routePtr);
    if (sharedRoute === undefined) throw new Error("Unexpected result");
    expect(sharedRoute.id).toBe(id);

    // Stops
    expect(sharedRoute.stops.length).toBe(stops.length);
    for (const stop of stops) {
      const sharedStop = Array.from(sharedRoute.stops).find((sharedStop) => SharedRAPTORDataInst.stops.get(sharedStop)?.id === stop);
      expect(sharedStop).not.toBe(undefined);
    }

    // Trips
    expect(sharedRoute.trips.length).toBe(trips.length);
    for (const [i, trip] of Array.from(trips).entries()) {
      // Order is important here
      const sharedTrip = sharedRoute.trips.at(i);
      expect(sharedTrip).not.toBe(undefined);

      for (const [i, time] of Array.from(trip).entries()) {
        // Order is important here
        const sharedTime = sharedTrip?.at(i);
        if (sharedTime === undefined) throw new Error("Unexpected result");
        expect(sharedTime[0]).toEqual(time[0]);
        expect(sharedTime[1]).toEqual(time[1]);
      }
    }
  }
}

describe("SharedRAPTORData class", () => {
  const SharedRAPTORDataInst = SharedRAPTORData.makeFromRawData(sharedTimeScal, stops, routes);
  describe("Default instantiation", () => {
    test("All stops are present and complete", () => {
      testStops(stops, SharedRAPTORDataInst);
    });

    test("All routes are present", () => {
      testRoutes(timeType, routes, SharedRAPTORDataInst);
    });
  });

  describe("From internal data instantiation", () => {
    const SharedRAPTORDataInstFromInt = SharedRAPTORData.makeFromInternalData(SharedRAPTORDataInst.timeType, SharedRAPTORDataInst.internalData);
    test("All stops are present and complete", () => {
      testStops(stops, SharedRAPTORDataInstFromInt);
    });

    test("All routes are present", () => {
      testRoutes(timeType, routes, SharedRAPTORDataInstFromInt);
    });
  });

  test("ArrayView functional", () => {
    SharedRAPTORDataInst.secure = true;

    for (const [_, { stops: sharedStops, id: sharedId }] of SharedRAPTORDataInst.routes) {
      const atZero = sharedStops.at(0);
      if (atZero === undefined) throw new Error("Unexpected result");
      expect(() => sharedStops.at(sharedStops.length)).toThrow("Invalid access");

      expect(sharedStops.indexOf(atZero)).toBe(0);
      expect(sharedStops.indexOf(Infinity)).toBe(-1);

      expect(sharedStops.map((sharedStop) => SharedRAPTORDataInst.stops.get(sharedStop)?.id)).toEqual(
        Array.from(routes).find(([id]) => id === sharedId)?.[1],
      );

      expect(sharedStops.reduce((acc, v) => `${acc}-${SharedRAPTORDataInst.stops.get(v)?.id}`, "")).toBe(
        Array.from(routes)
          .find(([id]) => id === sharedId)?.[1]
          ?.reduce((acc, v) => `${acc}-${v}`, ""),
      );
    }
  });

  test("Attaching stops", () => {
    const attachedStops = [
      [
        1,
        [],
        [
          { to: 7, length: 9 },
          { to: 4, length: 3 },
        ],
      ],
      [50, [], [{ to: 1, length: 10 }]],
    ] as const satisfies Parameters<SharedRAPTORData<unknown>["attachStops"]>[0];

    const SharedRAPTORDataInst = SharedRAPTORData.makeFromRawData(sharedTimeScal, stops, routes);
    SharedRAPTORDataInst.attachStops(attachedStops);

    const attachedStopsConverted = attachedStops.map(
      ([id, connectedRoutes, transfers]) =>
        [
          SharedRAPTORDataInst.stopPointerFromId(id) ?? SharedRAPTORData.serializeId(id),
          connectedRoutes,
          transfers.map((t: FootPath<number>) => ({
            to: SharedRAPTORDataInst.stopPointerFromId(t.to) ?? SharedRAPTORData.serializeId(t.to),
            length: t.length,
          })),
        ] as const,
    );

    const sTransfers = stops.find(([sId]) => sId === attachedStops[0][0])?.[2];
    if (!sTransfers) throw new Error("Unexpected data");
    for (const transfer of attachedStops[0][2]) for (const { to, length } of sTransfers) expect({ to, length }).not.toEqual(transfer);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const stop0 = SharedRAPTORDataInst.stops.get(attachedStopsConverted[0][0])!;
    for (const transfer of attachedStopsConverted[0][2])
      expect(Array.from(stop0.transfers()).map(({ to, length }) => ({ to, length }))).toContainEqual(transfer);
    expect(Array.from(stop0.transfers(4)).map(({ to, length }) => ({ to, length }))).toContainEqual(attachedStopsConverted[0][2][1]);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const stop1 = SharedRAPTORDataInst.stops.get(attachedStopsConverted[1][0])!;
    for (const transfer of attachedStopsConverted[1][2])
      expect(Array.from(stop1.transfers()).map(({ to, length }) => ({ to, length }))).toContainEqual(transfer);
  });
});

const originalTimeZ = 0;
const originalTimeInt = 3;
const originalTimeFloat = 3.3;
const originalTimeInf = -Infinity;

describe("Shared TimeScal", () => {
  const serializedTimeZ = sharedTimeScal.sharedSerialize(originalTimeZ);
  const serializedTimeInt = sharedTimeScal.sharedSerialize(originalTimeInt);
  const serializedTimeFloat = sharedTimeScal.sharedSerialize(originalTimeFloat);
  const serializedTimeInf = sharedTimeScal.sharedSerialize(originalTimeInf);

  test("Serialization", () => {
    expect(serializedTimeZ.length).toBe(1);
    expect(serializedTimeInt.length).toBe(1);
    expect(serializedTimeFloat.length).toBe(1);
    expect(serializedTimeInf.length).toBe(1);

    expect(serializedTimeZ[0]).toBe(originalTimeZ);
    expect(serializedTimeInt[0]).toBe(originalTimeInt);
    expect(serializedTimeFloat[0]).toBe(originalTimeFloat);
    expect(serializedTimeInf[0]).toBe(originalTimeInf);
  });

  test("Deserialization", () => {
    expect(sharedTimeScal.sharedDeserialize(serializedTimeZ)).toBe(originalTimeZ);
    expect(sharedTimeScal.sharedDeserialize(serializedTimeInt)).toBe(originalTimeInt);
    expect(sharedTimeScal.sharedDeserialize(serializedTimeFloat)).toBe(originalTimeFloat);
    expect(sharedTimeScal.sharedDeserialize(serializedTimeInf)).toBe(originalTimeInf);
  });
});

describe("Shared TimeIntOrderLow", () => {
  const originalTimeIntZ = [originalTimeZ, originalTimeZ] as const;
  const originalTimeIntInt = [originalTimeInt, originalTimeInt + 5] as const;
  const originalTimeIntFloat = [originalTimeFloat, originalTimeFloat + 5] as const;
  const originalTimeIntInf = [originalTimeInf, Infinity] as const;

  const serializedTimeIntZ = sharedTimeIntOrderLow.sharedSerialize(originalTimeIntZ);
  const serializedTimeIntInt = sharedTimeIntOrderLow.sharedSerialize(originalTimeIntInt);
  const serializedTimeIntFloat = sharedTimeIntOrderLow.sharedSerialize(originalTimeIntFloat);
  const serializedTimeIntInf = sharedTimeIntOrderLow.sharedSerialize(originalTimeIntInf);

  test("Serialization", () => {
    expect(serializedTimeIntZ.length).toBe(2);
    expect(serializedTimeIntInt.length).toBe(2);
    expect(serializedTimeIntFloat.length).toBe(2);
    expect(serializedTimeIntInf.length).toBe(2);

    expect(serializedTimeIntZ[0]).toBe(originalTimeIntZ[0]);
    expect(serializedTimeIntZ[1]).toBe(originalTimeIntZ[1]);
    expect(serializedTimeIntInt[0]).toBe(originalTimeIntInt[0]);
    expect(serializedTimeIntInt[1]).toBe(originalTimeIntInt[1]);
    expect(serializedTimeIntFloat[0]).toBe(originalTimeIntFloat[0]);
    expect(serializedTimeIntFloat[1]).toBe(originalTimeIntFloat[1]);
    expect(serializedTimeIntInf[0]).toBe(originalTimeIntInf[0]);
    expect(serializedTimeIntInf[1]).toBe(originalTimeIntInf[1]);
  });

  test("Deserialization", () => {
    expect(sharedTimeIntOrderLow.sharedDeserialize(serializedTimeIntZ)).toEqual(originalTimeIntZ);
    expect(sharedTimeIntOrderLow.sharedDeserialize(serializedTimeIntInt)).toEqual(originalTimeIntInt);
    expect(sharedTimeIntOrderLow.sharedDeserialize(serializedTimeIntFloat)).toEqual(originalTimeIntFloat);
    expect(sharedTimeIntOrderLow.sharedDeserialize(serializedTimeIntInf)).toEqual(originalTimeIntInf);
  });
});
