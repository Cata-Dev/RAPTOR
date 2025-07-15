import { describe, expect, test } from "@jest/globals";
import { Criterion, JourneyStep, Label, makeJSComparable, Route, footDistance, bufferTime, TimeScal } from "../src";
import { setLabelValues } from "./structures/utils";

describe("Foot distance", () => {
  const footDistanceTyped: Criterion<number, number, number, number, "footDistance"> = footDistance as Criterion<
    number,
    number,
    number,
    number,
    "footDistance"
  >;

  test("Naming", () => {
    expect(footDistanceTyped.name).toBe("footDistance");
  });

  const originJS: JourneyStep<number, number, number, number, [[number, "footDistance"]], "DEPARTURE"> = makeJSComparable({
    label: new Label<number, number, number, number, [[number, "footDistance"]]>(TimeScal, [footDistanceTyped], 0),
  });

  const vehicleJourneyStep = makeJSComparable<number, number, number, number, [[number, "footDistance"]], "VEHICLE">({
    boardedAt: [0, originJS],
    route: new Route(0, [0], [{ id: 0, times: [[1, 1]] }]),
    tripIndex: 0,
    label: new Label<number, number, number, number, [[number, "footDistance"]]>(TimeScal, [footDistanceTyped], 0),
  });

  const footJourneyStep1 = makeJSComparable<number, number, number, number, [[number, "footDistance"]], "FOOT">({
    boardedAt: [0, originJS],
    transfer: { to: 1, length: 3 },
    label: setLabelValues(new Label<number, number, number, number, [[number, "footDistance"]]>(TimeScal, [footDistanceTyped], 0), [4]),
  });

  const footJourneyStep2 = makeJSComparable<number, number, number, number, [[number, "footDistance"]], "FOOT">({
    boardedAt: [0, footJourneyStep1],
    transfer: { to: 0, length: 5 },
    label: setLabelValues(new Label<number, number, number, number, [[number, "footDistance"]]>(TimeScal, [footDistanceTyped], 0), [6]),
  });

  test("Update with vehicle", () => {
    expect(footDistanceTyped.update([originJS], vehicleJourneyStep, TimeScal, 0, 0)).toBe(0);
    expect(footDistanceTyped.update([originJS, footJourneyStep1], vehicleJourneyStep, TimeScal, 0, 0)).toBe(4);
  });

  test("Update with foot transfer", () => {
    expect(footDistanceTyped.update([originJS], footJourneyStep2, TimeScal, 0, 0)).toBe(5);
    expect(footDistanceTyped.update([originJS, footJourneyStep1], footJourneyStep2, TimeScal, 0, 0)).toBe(9);
  });

  test("Wrong usage", () => {
    expect(() => footDistanceTyped.update([], footJourneyStep1, TimeScal, 0, 0)).toThrow("A journey should at least contain the DEPARTURE label.");
  });
});

describe("Buffer time", () => {
  const bufferTimeTyped = bufferTime as Criterion<number, number, number, number, "bufferTime">;

  test("Naming", () => {
    expect(bufferTimeTyped.name).toBe("bufferTime");
  });

  const originJS: JourneyStep<number, number, number, number, [[number, "bufferTime"]], "DEPARTURE"> = makeJSComparable({
    label: new Label<number, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 0),
  });

  const footJourneyStep = makeJSComparable<number, number, number, number, [[number, "bufferTime"]], "FOOT">({
    boardedAt: [0, originJS],
    transfer: { to: 0, length: 3 },
    label: new Label<number, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 0),
  });

  const vehicleJourneyStep1 = makeJSComparable<number, number, number, number, [[number, "bufferTime"]], "VEHICLE">({
    boardedAt: [0, originJS],
    route: new Route(0, [0], [{ id: 0, times: [[4, 5]] }]),
    tripIndex: 0,
    label: setLabelValues(new Label<number, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 4), [-5]),
  });

  const vehicleJourneyStep2 = makeJSComparable<number, number, number, number, [[number, "bufferTime"]], "VEHICLE">({
    boardedAt: [0, vehicleJourneyStep1],
    route: new Route(1, [0], [{ id: 0, times: [[7, 8]] }]),
    tripIndex: 0,
    label: setLabelValues(new Label<number, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 8), [-4]),
  });

  test("Update with foot transfer", () => {
    expect(bufferTimeTyped.update([originJS], footJourneyStep, TimeScal, 0, 0)).toBe(-Infinity);
    expect(bufferTimeTyped.update([originJS, vehicleJourneyStep1], footJourneyStep, TimeScal, 0, 0)).toBe(-5);
  });

  test("Update with vehicle", () => {
    expect(bufferTimeTyped.update([originJS], vehicleJourneyStep1, TimeScal, 0, 0)).toBe(-5);
    expect(bufferTimeTyped.update([originJS, vehicleJourneyStep1], vehicleJourneyStep2, TimeScal, 0, 0)).toBe(-4);
  });

  test("Wrong usage", () => {
    expect(() => bufferTimeTyped.update([], vehicleJourneyStep1, TimeScal, 0, 0)).toThrow("A journey should at least contain the DEPARTURE label.");
  });
});
