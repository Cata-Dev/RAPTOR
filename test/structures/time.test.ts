import { describe, expect, test } from "@jest/globals";
import { makeTime, MAX_SAFE_TIMESTAMP, Time, TimeScal } from "../../src";

function testTimeScalProps(timeScal: Time<number>) {
  expect(timeScal.MAX).toBe(Infinity);
  expect(timeScal.MAX_SAFE).toBe(MAX_SAFE_TIMESTAMP);
  expect(timeScal.MIN).toBe(-Infinity);
}

function testTimeScalMethods(timeScal: Time<number>) {
  expect(timeScal.max()).toBe(-Infinity);
  expect(timeScal.max(-5, 0, -3.1, 2, 1.2)).toBe(2);

  expect(timeScal.min()).toBe(Infinity);
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
