import { describe, expect, test } from "@jest/globals";
import { MAX_SAFE_TIMESTAMP, TimeScal } from "../../src";

describe("timeScal", () => {
  test("Props are correct", () => {
    expect(TimeScal.MAX).toBe(Infinity);
    expect(TimeScal.MAX_SAFE).toBe(MAX_SAFE_TIMESTAMP);
    expect(TimeScal.MIN).toBe(-Infinity);
  });

  test("Methods behave as expected", () => {
    expect(TimeScal.max()).toBe(-Infinity);
    expect(TimeScal.max(-5, -3.1, 0, 1.2, 2)).toBe(2);

    expect(TimeScal.min()).toBe(Infinity);
    expect(TimeScal.min(-5, -3.1, 0, 1.2, 2)).toBe(-5);

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
