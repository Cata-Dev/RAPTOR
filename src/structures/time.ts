/**
 * A timestamp representation of a Date ; in milliseconds.
 */
type Timestamp = number;

const MAX_SAFE_TIMESTAMP = 8_640_000_000_000_000;

/**
 * Define a generic order relation
 * @param a First value to compare
 * @param b Second value to compare
 * @return `> 0` if `a > b`, `0` if `a` equals `b` and `< 0` if `a < b`
 */
type Order<T> = (this: void, a: T, b: T) => number;

interface Ordered<T> {
  order: Order<T>;
}

interface OrderedWithMethods<T> extends Ordered<T> {
  // Naturally deduced by `order`
  min: (...values: T[]) => T;
  max: (...values: T[]) => T;
}

function makeOrderWithMethods<T>(order: Order<T>, MIN: T, MAX: T): OrderedWithMethods<T> {
  return {
    order,

    min: (...values) => values.reduce((acc, v) => (order(v, acc) < 0 ? v : acc), MAX),
    max: (...values) => values.reduce((acc, v) => (order(v, acc) > 0 ? v : acc), MIN),
  };
}

/**
 * Time, ordered by a.up and b.low
 */
interface Time<T> {
  /** Typically {@link MAX_SAFE_TIMESTAMP}, i.e. the max safe value to this time representation */
  readonly MAX_SAFE: T;
  /** Typically {@link Infinity}, i.e. the value such that any other value of the same type is lower */
  readonly MAX: T;
  /** Typically {@link -Infinity}, i.e. the value such that any other value of the same type is greater */
  readonly MIN: T;

  plusScal: (this: void, timeVal: T, timeScal: Timestamp) => T;

  /** Lower bound */
  low(this: void, timeVal: T): Timestamp;
  setLow(this: void, timeVal: T, low: Timestamp): T;
  /** Upper bound */
  up(this: void, timeVal: T): Timestamp;

  strict: OrderedWithMethods<T>;
  large: OrderedWithMethods<T>;
}

function makeTime<T>(
  MAX_SAFE: T,
  MAX: T,
  MIN: T,
  low: Time<T>["low"],
  setLow: Time<T>["setLow"],
  up: Time<T>["up"],
  plusScal: Time<T>["plusScal"],
): Time<T> {
  return {
    MAX_SAFE,
    MAX,
    MIN,

    plusScal,

    low,
    setLow,
    up,

    strict: makeOrderWithMethods((a, b) => (low(a) > up(b) ? 1 : up(a) < low(b) ? -1 : 0), MIN, MAX),
    large: makeOrderWithMethods((a, b) => (low(a) === low(b) && up(a) === up(b) ? 0 : up(a) > low(b) ? 1 : low(a) < up(b) ? -1 : NaN), MIN, MAX),
  };
}

/**
 * The time type for scalar internal type: {@link Time<Timestamp>}
 */
const TimeScal: Time<Timestamp> = makeTime(
  MAX_SAFE_TIMESTAMP,
  Infinity,
  -Infinity,
  (timeVal) => timeVal,
  (timeVal, low) => (low > timeVal ? low : timeVal),
  (timeVal) => timeVal,
  (timeVal, timeScal) => timeVal + timeScal,
);

type InternalTimeInt = readonly [Timestamp, Timestamp];

/**
 * A time defined by an interval
 * Warning: with large order, min & max should only be used with MAX & MIN
 */
const TimeInt = makeTime<InternalTimeInt>(
  [MAX_SAFE_TIMESTAMP, MAX_SAFE_TIMESTAMP],
  [Infinity, Infinity],
  [-Infinity, -Infinity],
  (timeVal) => timeVal[0],
  (timeVal, low) => (low > timeVal[0] ? ([Math.min(low, timeVal[1]), timeVal[1]] as const) : timeVal),
  (timeVal) => timeVal[1],
  ([low, high], timeScal) => [low + timeScal, high + timeScal],
);

export { makeTime, MAX_SAFE_TIMESTAMP, TimeInt, TimeScal };
export type { InternalTimeInt, Ordered, Time, Timestamp };
