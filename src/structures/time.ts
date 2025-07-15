/**
 * A timestamp representation of a Date ; in milliseconds.
 */
type Timestamp = number;

const MAX_SAFE_TIMESTAMP = 8_640_000_000_000_000;

/**
 * Generic order relation
 */
interface Ordered<T> {
  /**
   * Define an order relation
   * @param a First value to compare
   * @param b Second value to compare
   * @return `> 0` if `a > b`, `0` if `a` equals `b` and `< 0` if `a < b`
   */
  order: (this: void, a: T, b: T) => number;
}

interface Time<T> extends Ordered<T> {
  /** Typically {@link MAX_SAFE_TIMESTAMP}, i.e. the max safe value to this time representation */
  readonly MAX_SAFE: T;
  /** Typically {@link Infinity}, i.e. the value such that any other value of the same type is lower */
  readonly MAX: T;
  /** Typically {@link -Infinity}, i.e. the value such that any other value of the same type is greater */
  readonly MIN: T;

  /** Lower bound */
  low(this: void, timeVal: T): Timestamp;
  /** Upper bound */
  up(this: void, timeVal: T): Timestamp;

  plusScal: (this: void, timeVal: T, timeScal: Timestamp) => T;

  min: (...values: T[]) => T;
  max: (...values: T[]) => T;
}

function makeTimeOrderLow<T>(MAX_SAFE: T, MAX: T, MIN: T, low: Time<T>["low"], up: Time<T>["up"], plusScal: Time<T>["plusScal"]): Time<T> {
  const order: Time<T>["order"] = (a, b) =>
    // Can't use `a - b` otherwise it fails with (-Infinity, Infinity)
    low(a) > low(b) ? 1 : low(a) < low(b) ? -1 : 0;

  return {
    order,
    MAX_SAFE,
    MAX,
    MIN,

    low,
    up,

    plusScal,

    min: (...values) => values.reduce((acc, v) => (order(v, acc) <= 0 ? v : acc), MAX),
    max: (...values) => values.reduce((acc, v) => (order(v, acc) >= 0 ? v : acc), MIN),
  };
}

/**
 * The time type for scalar internal type: {@link Time<Timestamp>}
 */
const TimeScal: Time<Timestamp> = makeTimeOrderLow(
  MAX_SAFE_TIMESTAMP,
  Infinity,
  -Infinity,
  (timeVal) => timeVal,
  (timeVal) => timeVal,
  (timeVal, timeScal) => timeVal + timeScal,
);

type InternalTimeInt = readonly [Timestamp, Timestamp];

/**
 * A time defined by an interval, ordered by its lower bound.
 */
const TimeIntOrderLow = makeTimeOrderLow<InternalTimeInt>(
  [MAX_SAFE_TIMESTAMP, MAX_SAFE_TIMESTAMP],
  [Infinity, Infinity],
  [-Infinity, -Infinity],
  (timeVal) => timeVal[0],
  (timeVal) => timeVal[1],
  ([low, high], timeScal) => [low + timeScal, high + timeScal],
);

export { makeTimeOrderLow, MAX_SAFE_TIMESTAMP, TimeIntOrderLow, TimeScal };
export type { InternalTimeInt, Ordered, Time, Timestamp };
