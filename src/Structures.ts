/**
 * A timestamp representation of a Date ; in milliseconds.
 */
export type timestamp = number;
export type Id = number | string;

export const MAX_SAFE_TIMESTAMP = 8_640_000_000_000_000;

/**
 * General {@link Array} subpart, constrained to some read-only features.
 */
export interface ArrayRead<T> {
  [x: number]: T;
  readonly length: number;
  [Symbol.iterator]: () => ArrayIterator<T>;
  indexOf: InstanceType<typeof Array<T>>["indexOf"];
  // Ignore thisArg, not used
  map: <U>(callbackfn: (value: T, index: number, array: ArrayRead<T>) => U) => ArrayRead<U>;
  reduce: <U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: ArrayRead<T>) => U, initialValue: U) => U;
}

/**
 * General {@link Map} subpart, constrained to some read-only features.
 */
export interface MapRead<K, V> {
  [Symbol.iterator]: () => MapIterator<[K, V]>;
  get: (key: K) => V | undefined;
}

/**
 * @description A Trip, i.e. a succession of stop times.
 */
export interface Trip<TI extends Id = Id> {
  id: TI;
  /**
   * @param stopTimes Time of arrival & departure at each stop.
   */
  times: ArrayRead<[timestamp, timestamp]>;
}

export interface FootPath<SI extends Id> {
  to: SI;
  length: number;
}

/**
 * @description A Stop, i.e. a geographical specific point that is connected to routes.
 */
export interface Stop<SI extends Id, RI extends Id> {
  readonly id: SI;
  readonly connectedRoutes: ArrayRead<RI>;
  readonly transfers: ArrayRead<FootPath<SI>>;
}

/**
 * @description A Route, i.e. a succession of geographical specific points (stops) alongside with their corresponding operated trips.
 */
export class Route<SI extends Id, RI extends Id, TI extends Id = Id> {
  /**
   * @description Creates a new Route. Note that stops and trips are linked : they are cross-connected.
   */
  constructor(
    readonly id: RI,
    readonly stops: ArrayRead<SI>,
    readonly trips: ArrayRead<Trip<TI>>,
  ) {}

  /**
   * @description Computes the departure time on a trip at stop p.
   * @param t Trip index in route.
   * @param p Stop index in route (trip).
   */
  departureTime(t: number, p: SI): timestamp {
    return this.trips[t].times[this.stops.indexOf(p)][0];
  }
}

export class RAPTORData<SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> {
  readonly stops: MapRead<SI, Stop<SI, RI>>;
  readonly routes: MapRead<RI, Route<SI, RI, TI>>;

  /**
   * @description Creates a new RAPTORData instance for a defined network.
   */
  constructor(stops: ArrayRead<Stop<SI, RI>>, routes: ArrayRead<ConstructorParameters<typeof Route<SI, RI, TI>>>) {
    this.stops = new Map(stops.map((s) => [s.id, s]));
    this.routes = new Map(routes.map(([rId, stopsIds, trips]) => [rId, new Route(rId, stopsIds, trips)]));
  }
}
