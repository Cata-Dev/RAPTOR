/**
 * A timestamp representation of a Date ; in milliseconds.
 */
type Timestamp = number;

const MAX_SAFE_TIMESTAMP = 8_640_000_000_000_000;

/**
 * Generic order relation
 */
type Order<T> =
  /**
   * Define an order relation
   * @param a First value to compare
   * @param b Second value to compare
   * @return `> 0` if `a > b`, `0` if `a` equals `b` and `< 0` if `a < b`
   */
  (a: T, b: T) => number;
interface Time<T> {
  order: Order<T>;
  /** Typically {@link MAX_SAFE_TIMESTAMP}, i.e. the max safe value to this time representation */
  readonly MAX_SAFE: T;
  /** Typically {@link Infinity}, i.e. the value such that any other value of the same type is lower */
  readonly MAX: T;
  /** Typically {@link -Infinity}, i.e. the value such that any other value of the same type is greater */
  readonly MIN: T;

  plusScal: (timeVal: T, timeScal: Timestamp) => T;

  min: (...values: T[]) => T;
  max: (...values: T[]) => T;
}

function makeTime<T>(order: Time<T>["order"], MAX_SAFE: T, MAX: T, MIN: T, plusScal: Time<T>["plusScal"]): Time<T> {
  return {
    order,
    MAX_SAFE,
    MAX,
    MIN,

    plusScal,

    min: (...values) => values.reduce((acc, v) => (order(v, acc) <= 0 ? v : acc), MAX),
    max: (...values) => values.reduce((acc, v) => (order(v, acc) >= 0 ? v : acc), MIN),
  };
}

/**
 * The time type for scalar internal type: {@link Time<number>}
 */
const TimeScal: Time<number> = {
  order: (a, b) =>
    // Can't use `a - b` otherwise it fails with (-Infinity, Infinity)
    a > b ? 1 : a < b ? -1 : 0,
  MAX_SAFE: MAX_SAFE_TIMESTAMP,
  MAX: Infinity,
  MIN: -Infinity,

  plusScal: (timeVal, timeScal) => timeVal + timeScal,

  min: Math.min,
  max: Math.max,
};

export { makeTime, MAX_SAFE_TIMESTAMP, TimeScal };
export type { Time, Timestamp };
