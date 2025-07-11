import { describe, expect, test } from "@jest/globals";
import { makeTime, MAX_SAFE_TIMESTAMP, Time, TimeIntOrderLow, TimeScal } from "../../src";

function testTimeScalProps(timeScal: Time<number>) {
  expect(timeScal.MAX).toBe(Infinity);
  expect(timeScal.MAX_SAFE).toBe(MAX_SAFE_TIMESTAMP);
  expect(timeScal.MIN).toBe(-Infinity);
}

function testTimeScalMethods(timeScal: Time<number>) {
  expect(timeScal.max()).toBe(timeScal.MIN);
  expect(timeScal.max(-5, 0, -3.1, 2, 1.2)).toBe(2);

  expect(timeScal.min()).toBe(timeScal.MAX);
  expect(timeScal.min(-5, 0, -3.1, 2, 1.2)).toBe(-5);

  expect(timeScal.order(0, 0) === 0).toBe(true);
  expect(timeScal.order(0, 3) < 0).toBe(true);
  expect(timeScal.order(3, 0) > 0).toBe(true);
  expect(timeScal.order(0, 3.3) < 0).toBe(true);
  expect(timeScal.order(3.3, 0) > 0).toBe(true);
  expect(timeScal.order(-Infinity, Infinity) < 0).toBe(true);

  expect(timeScal.plusScal(0, 0)).toBe(0);
  expect(timeScal.plusScal(1, 3)).toBe(4);
  expect(timeScal.plusScal(3, 1)).toBe(4);
  expect(timeScal.plusScal(1, 3.3)).toBe(4.3);
  expect(timeScal.plusScal(1, Infinity)).toBe(Infinity);
  expect(timeScal.plusScal(Infinity, 1)).toBe(Infinity);
  expect(timeScal.plusScal(1, -Infinity)).toBe(-Infinity);
  expect(timeScal.plusScal(-Infinity, 1)).toBe(-Infinity);
}

describe("timeScal", () => {
  test("Props are correct", () => {
    testTimeScalProps(TimeScal);
  });

  test("Methods behave as expected", () => {
    testTimeScalMethods(TimeScal);
  });
});

describe("makeTime", () => {
  describe("with TimeScal", () => {
    const timeScalMade = makeTime(TimeScal.order, TimeScal.MAX_SAFE, TimeScal.MAX, TimeScal.MIN, TimeScal.plusScal);

    test("Props are correct", () => {
      testTimeScalProps(timeScalMade);
    });

    test("Methods behave as expected", () => {
      testTimeScalMethods(timeScalMade);
    });
  });
});

describe("timeIntOrderLow", () => {
  test("Props are correct", () => {
    expect(TimeIntOrderLow.MAX).toEqual([Infinity, Infinity]);
    expect(TimeIntOrderLow.MAX_SAFE).toEqual([MAX_SAFE_TIMESTAMP, MAX_SAFE_TIMESTAMP]);
    expect(TimeIntOrderLow.MIN).toEqual([-Infinity, -Infinity]);
  });

  test("Methods behave as expected", () => {
    expect(TimeIntOrderLow.max()).toBe(TimeIntOrderLow.MIN);
    expect(TimeIntOrderLow.max([-5, Infinity], [0, -10], [-3.1, 2], [2, -Infinity], [1.2, 3])).toEqual([2, -Infinity]);

    expect(TimeIntOrderLow.min()).toBe(TimeIntOrderLow.MAX);
    expect(TimeIntOrderLow.min([-5, Infinity], [0, -10], [-3.1, 2], [2, -Infinity], [1.2, 3])).toEqual([-5, Infinity]);

    expect(TimeIntOrderLow.order([0, 1], [0, 2]) === 0).toBe(true);
    expect(TimeIntOrderLow.order([0, 8], [3, 4]) < 0).toBe(true);
    expect(TimeIntOrderLow.order([3, 4], [0, 8]) > 0).toBe(true);
    expect(TimeIntOrderLow.order([0, 8], [3, 4]) < 0).toBe(true);
    expect(TimeIntOrderLow.order([3, 4], [0, 8]) > 0).toBe(true);
    expect(TimeIntOrderLow.order([-Infinity, Infinity], [Infinity, Infinity]) < 0).toBe(true);

    expect(TimeIntOrderLow.plusScal([0, 1], 0)).toEqual([0, 1]);
    expect(TimeIntOrderLow.plusScal([1, 3], 3)).toEqual([4, 6]);
    expect(TimeIntOrderLow.plusScal([3, 4], 1)).toEqual([4, 5]);
    expect(TimeIntOrderLow.plusScal([1, 2], 3.3)).toEqual([4.3, 5.3]);
    expect(TimeIntOrderLow.plusScal([1, 10], Infinity)).toEqual([Infinity, Infinity]);
    expect(TimeIntOrderLow.plusScal([5, Infinity], 1)).toEqual([6, Infinity]);
    expect(TimeIntOrderLow.plusScal([1, 1_000_000], -Infinity)).toEqual([-Infinity, -Infinity]);
    expect(TimeIntOrderLow.plusScal([-Infinity, 2], 1)).toEqual([-Infinity, 3]);
  });
});
