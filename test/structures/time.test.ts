import { describe, expect, test } from "@jest/globals";
import { InternalTimeInt, makeTime, MAX_SAFE_TIMESTAMP, Time, TimeInt, TimeScal } from "../../src";

function testTimeIntProps(TimeInt: Time<InternalTimeInt>) {
  expect(TimeInt.MAX).toEqual([Infinity, Infinity]);
  expect(TimeInt.MAX_SAFE).toEqual([MAX_SAFE_TIMESTAMP, MAX_SAFE_TIMESTAMP]);
  expect(TimeInt.MIN).toEqual([-Infinity, -Infinity]);
}

function testTimeIntMethods(TimeInt: Time<InternalTimeInt>) {
  expect(TimeInt.low([-Infinity, 5])).toBe(-Infinity);
  expect(TimeInt.low([0, 3])).toBe(0);
  expect(TimeInt.low([3, 5])).toBe(3);
  expect(TimeInt.low([Infinity, Infinity + 1])).toBe(Infinity);

  expect(TimeInt.up([-Infinity, 5])).toBe(5);
  expect(TimeInt.up([-3, 0])).toBe(0);
  expect(TimeInt.up([0, 5])).toBe(5);
  expect(TimeInt.up([Infinity - 1, Infinity])).toBe(Infinity);

  expect(TimeInt.plusScal([0, 1], 0)).toEqual([0, 1]);
  expect(TimeInt.plusScal([1, 3], 3)).toEqual([4, 6]);
  expect(TimeInt.plusScal([3, 4], 1)).toEqual([4, 5]);
  expect(TimeInt.plusScal([1, 2], 3.3)).toEqual([4.3, 5.3]);
  expect(TimeInt.plusScal([1, 10], Infinity)).toEqual([Infinity, Infinity]);
  expect(TimeInt.plusScal([5, Infinity], 1)).toEqual([6, Infinity]);
  expect(TimeInt.plusScal([1, 1_000_000], -Infinity)).toEqual([-Infinity, -Infinity]);
  expect(TimeInt.plusScal([-Infinity, 2], 1)).toEqual([-Infinity, 3]);

  // Strict => large
  // Large & strict = 0 => incomparable

  // Comparable (strict)

  // [ ]
  //     [ ]
  expect(TimeInt.strict.order([0, 1], [2, 3])).toBeLessThan(0);
  expect(TimeInt.large.order([0, 1], [2, 3])).toBeLessThan(0);
  expect(TimeInt.strict.order([2, 3], [0, 1])).toBeGreaterThan(0);
  expect(TimeInt.large.order([2, 3], [0, 1])).toBeGreaterThan(0);

  // Incomparable (overlaps)

  // [  ]
  //   [  ]
  expect(TimeInt.strict.order([0, 2], [1, 3])).toBe(0);
  expect(TimeInt.strict.order([1, 3], [0, 2])).toBe(0);
  expect(TimeInt.large.order([0, 2], [1, 3])).toBeGreaterThan(0);
  expect(TimeInt.large.order([1, 3], [0, 2])).toBeGreaterThan(0);

  // [  ]
  //    [  ]
  expect(TimeInt.strict.order([0, 2], [2, 4])).toBe(0);
  expect(TimeInt.strict.order([2, 4], [0, 2])).toBe(0);
  expect(TimeInt.large.order([0, 2], [2, 4])).toBeLessThan(0);
  expect(TimeInt.large.order([2, 4], [0, 2])).toBeGreaterThan(0);

  // Incomparable (included)

  // [ ]
  // [   ]
  expect(TimeInt.strict.order([0, 1], [0, 2])).toBe(0);
  expect(TimeInt.strict.order([0, 2], [0, 1])).toBe(0);
  expect(TimeInt.large.order([0, 1], [0, 2])).toBeGreaterThan(0);
  expect(TimeInt.large.order([0, 2], [0, 1])).toBeGreaterThan(0);

  // Equal

  // [   ]
  // [   ]
  expect(TimeInt.strict.order([0, 2], [0, 2])).toBe(0);
  expect(TimeInt.large.order([0, 2], [0, 2])).toBe(0);

  // []
  // []
  expect(TimeInt.strict.order([2, 2], [2, 2])).toBe(0);
  expect(TimeInt.large.order([2, 2], [2, 2])).toBe(0);

  expect(TimeInt.strict.max()).toBe(TimeInt.MIN);
  expect(TimeInt.large.max()).toBe(TimeInt.MIN);
  expect(TimeInt.strict.max([-5, 5], [-7, -2], TimeInt.MIN, [-3.1, 2], TimeInt.MAX, [-Infinity, 15], [1.2, 3])).toBe(TimeInt.MAX);
  expect(TimeInt.large.max([-5, 5], [-7, -2], TimeInt.MIN, [-3.1, 2], TimeInt.MAX, [-Infinity, 15], [1.2, 3])).toBe(TimeInt.MAX);
  expect(TimeInt.strict.max([-5, 5], [-7, -2], TimeInt.MIN, [-3.1, 2], [18, 20], [-Infinity, 15], [1.2, 3])).toEqual([18, 20]);

  expect(TimeInt.strict.min()).toBe(TimeInt.MAX);
  expect(TimeInt.large.min()).toBe(TimeInt.MAX);
  expect(TimeInt.strict.min([-5, 5], [-7, -2], TimeInt.MIN, [-3.1, 2], TimeInt.MAX, [-Infinity, 15], [1.2, 3])).toBe(TimeInt.MIN);
  expect(TimeInt.large.min([-5, 5], [-7, -2], TimeInt.MIN, [-3.1, 2], TimeInt.MAX, [-Infinity, 15], [1.2, 3])).toBe(TimeInt.MIN);
  expect(TimeInt.strict.min([-5, 5], [-7, -2], [-25, -15], [-3.1, 2], TimeInt.MAX, [2, Infinity], [1.2, 3])).toEqual([-25, -15]);
}

describe("Scalar time", () => {
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

    expect(TimeScal.plusScal(0, 0)).toBe(0);
    expect(TimeScal.plusScal(1, 3)).toBe(4);
    expect(TimeScal.plusScal(3, 1)).toBe(4);
    expect(TimeScal.plusScal(1, 3.3)).toBe(4.3);
    expect(TimeScal.plusScal(1, Infinity)).toBe(Infinity);
    expect(TimeScal.plusScal(Infinity, 1)).toBe(Infinity);
    expect(TimeScal.plusScal(1, -Infinity)).toBe(-Infinity);
    expect(TimeScal.plusScal(-Infinity, 1)).toBe(-Infinity);

    for (const TimeScalOrdered of [TimeScal.strict, TimeScal.large]) {
      expect(TimeScalOrdered.order(0, 0) === 0).toBe(true);
      expect(TimeScalOrdered.order(0, 3) < 0).toBe(true);
      expect(TimeScalOrdered.order(3, 0) > 0).toBe(true);
      expect(TimeScalOrdered.order(0, 3.3) < 0).toBe(true);
      expect(TimeScalOrdered.order(3.3, 0) > 0).toBe(true);
      expect(TimeScalOrdered.order(-Infinity, Infinity) < 0).toBe(true);

      expect(TimeScalOrdered.max()).toBe(TimeScal.MIN);
      expect(TimeScalOrdered.max(-5, 0, -3.1, 2, 1.2)).toBe(2);

      expect(TimeScalOrdered.min()).toBe(TimeScal.MAX);
      expect(TimeScalOrdered.min(-5, 0, -3.1, 2, 1.2)).toBe(-5);
    }
  });
});

describe("Making time", () => {
  describe("with interval time", () => {
    const timeMade = makeTime(TimeInt.MAX_SAFE, TimeInt.MAX, TimeInt.MIN, TimeInt.low, TimeInt.up, TimeInt.plusScal);

    test("Props are correct", () => {
      testTimeIntProps(timeMade);
    });

    test("Methods behave as expected", () => {
      testTimeIntMethods(timeMade);
    });
  });
});

describe("Interval time", () => {
  test("Props are correct", () => {
    testTimeIntProps(TimeInt);
  });

  test("Methods behave as expected", () => {
    testTimeIntMethods(TimeInt);
  });
});
