import { describe, expect, test } from "@jest/globals";
import { InternalTimeInt, makeTimeOrderLow, MAX_SAFE_TIMESTAMP, Time, TimeIntOrderLow, TimeScal } from "../../src";

function testTimeIntOLProps(TimeIntOrderLow: Time<InternalTimeInt>) {
  expect(TimeIntOrderLow.MAX).toEqual([Infinity, Infinity]);
  expect(TimeIntOrderLow.MAX_SAFE).toEqual([MAX_SAFE_TIMESTAMP, MAX_SAFE_TIMESTAMP]);
  expect(TimeIntOrderLow.MIN).toEqual([-Infinity, -Infinity]);
}

function testTimeIntOLMethods(TimeIntOrderLow: Time<InternalTimeInt>) {
  expect(TimeIntOrderLow.low([-Infinity, 5])).toBe(-Infinity);
  expect(TimeIntOrderLow.low([0, 3])).toBe(0);
  expect(TimeIntOrderLow.low([3, 5])).toBe(3);
  expect(TimeIntOrderLow.low([Infinity, Infinity + 1])).toBe(Infinity);

  expect(TimeIntOrderLow.up([-Infinity, 5])).toBe(5);
  expect(TimeIntOrderLow.up([-3, 0])).toBe(0);
  expect(TimeIntOrderLow.up([0, 5])).toBe(5);
  expect(TimeIntOrderLow.up([Infinity - 1, Infinity])).toBe(Infinity);

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
}

describe("TimeScal", () => {
  test("Props are correct", () => {
    expect(TimeScal.MAX).toBe(Infinity);
    expect(TimeScal.MAX_SAFE).toBe(MAX_SAFE_TIMESTAMP);
    expect(TimeScal.MIN).toBe(-Infinity);
  });

  test("Methods behave as expected", () => {
    expect(TimeScal.low(-Infinity)).toBe(-Infinity);
    expect(TimeScal.low(0)).toBe(0);
    expect(TimeScal.low(3)).toBe(3);
    expect(TimeScal.low(Infinity)).toBe(Infinity);

    expect(TimeScal.up(-Infinity)).toBe(-Infinity);
    expect(TimeScal.up(0)).toBe(0);
    expect(TimeScal.up(3)).toBe(3);
    expect(TimeScal.up(Infinity)).toBe(Infinity);

    expect(TimeScal.max()).toBe(TimeScal.MIN);
    expect(TimeScal.max(-5, 0, -3.1, 2, 1.2)).toBe(2);

    expect(TimeScal.min()).toBe(TimeScal.MAX);
    expect(TimeScal.min(-5, 0, -3.1, 2, 1.2)).toBe(-5);

    expect(TimeScal.order(0, 0) === 0).toBe(true);
    expect(TimeScal.order(0, 3) < 0).toBe(true);
    expect(TimeScal.order(3, 0) > 0).toBe(true);
    expect(TimeScal.order(0, 3.3) < 0).toBe(true);
    expect(TimeScal.order(3.3, 0) > 0).toBe(true);
    expect(TimeScal.order(-Infinity, Infinity) < 0).toBe(true);

    expect(TimeScal.plusScal(0, 0)).toBe(0);
    expect(TimeScal.plusScal(1, 3)).toBe(4);
    expect(TimeScal.plusScal(3, 1)).toBe(4);
    expect(TimeScal.plusScal(1, 3.3)).toBe(4.3);
    expect(TimeScal.plusScal(1, Infinity)).toBe(Infinity);
    expect(TimeScal.plusScal(Infinity, 1)).toBe(Infinity);
    expect(TimeScal.plusScal(1, -Infinity)).toBe(-Infinity);
    expect(TimeScal.plusScal(-Infinity, 1)).toBe(-Infinity);
  });
});

describe("makeTimeOrderLow", () => {
  describe("with timeIntOrderLow", () => {
    const timeMade = makeTimeOrderLow(
      TimeIntOrderLow.MAX_SAFE,
      TimeIntOrderLow.MAX,
      TimeIntOrderLow.MIN,
      TimeIntOrderLow.low,
      TimeIntOrderLow.up,
      TimeIntOrderLow.plusScal,
    );

    test("Props are correct", () => {
      testTimeIntOLProps(timeMade);
    });

    test("Methods behave as expected", () => {
      testTimeIntOLMethods(timeMade);
    });
  });
});

describe("timeIntOrderLow", () => {
  test("Props are correct", () => {
    testTimeIntOLProps(TimeIntOrderLow);
  });

  test("Methods behave as expected", () => {
    testTimeIntOLMethods(TimeIntOrderLow);
  });
});
