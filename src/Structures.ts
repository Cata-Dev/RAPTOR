/**
 * A timestamp representation of a Date ; in milliseconds.
 */
export type timestamp = number;
export type Id = number | string;

/**
 * General {@link Array} subpart, constrained to some read-only features.
 */
export interface ArrayRead<T> {
  at: InstanceType<typeof Array<T>>["at"];
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
  departureTime(t: number, p: number): timestamp {
    return this.trips.at(t)?.times.at(p)?.[0] ?? 0;
  }
}

interface IRAPTORData<SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> {
  readonly MAX_SAFE_TIMESTAMP: number;
  readonly stops: MapRead<SI, Stop<SI, RI>>;
  readonly routes: MapRead<RI, Route<SI, RI, TI>>;
}

export class RAPTORData<SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> implements IRAPTORData<SI, RI, TI> {
  static readonly MAX_SAFE_TIMESTAMP: number = 8_640_000_000_000_000;
  readonly MAX_SAFE_TIMESTAMP: number = RAPTORData.MAX_SAFE_TIMESTAMP;
  readonly _stops: MapRead<SI, Stop<SI, RI>>;
  readonly _routes: MapRead<RI, Route<SI, RI, TI>>;
  protected attachedStops: MapRead<SI, Stop<SI, RI>> = new Map();
  protected attachedRoutes: MapRead<RI, Route<SI, RI, TI>> = new Map();

  /**
   * @description Creates a new RAPTORData instance for a defined network.
   */
  constructor(stops: ArrayRead<Stop<SI, RI>>, routes: ArrayRead<ConstructorParameters<typeof Route<SI, RI, TI>>>) {
    this._stops = new Map(stops.map((s) => [s.id, s]));
    this._routes = new Map(routes.map(([rId, stopsIds, trips]) => [rId, new Route(rId, stopsIds, trips)] as const));
  }

  protected getStop(key: SI) {
    const original = this._stops.get(key);
    const attached = this.attachedStops.get(key);
    if (!original && !attached) return undefined;

    // Merge data
    return {
      id: key,
      connectedRoutes: [...(original?.connectedRoutes ?? []), ...(attached?.connectedRoutes ?? [])],
      transfers: [...(original?.transfers ?? []), ...(attached?.transfers ?? [])],
    };
  }

  get stops() {
    return {
      get: (key) => this.getStop(key),
      [Symbol.iterator]: function* (this: RAPTORData<SI, RI, TI>) {
        const seen = new Set<SI>();

        for (const [k] of this._stops) {
          yield [k, this.getStop(k)!] satisfies [SI, Stop<SI, RI>];
          seen.add(k);
        }

        for (const [k, v] of this.attachedStops) {
          if (seen.has(k)) continue;

          yield [k, v] satisfies [SI, Stop<SI, RI>];
          seen.add(k);
        }

        return undefined;
      }.bind(this),
    } satisfies IRAPTORData<SI, RI, TI>["stops"];
  }

  protected getRoute(key: RI) {
    const original = this._routes.get(key);
    const attached = this.attachedRoutes.get(key);
    if (!original && !attached) return undefined;

    // Merge data
    return new Route<SI, RI, TI>(
      key,
      [...(original?.stops ?? []), ...(attached?.stops ?? [])],
      [...(original?.trips ?? []), ...(attached?.trips ?? [])],
    );
  }

  get routes() {
    return {
      get: (key: RI) => this.getRoute(key),
      [Symbol.iterator]: function* (this: RAPTORData<SI, RI, TI>) {
        const seen = new Set<RI>();

        for (const [k] of this._routes) {
          if (seen.has(k)) continue;

          yield [k, this.getRoute(k)!] satisfies [RI, Route<SI, RI, TI>];
          seen.add(k);
        }

        for (const [k, v] of this.attachedRoutes) {
          if (seen.has(k)) continue;

          yield [k, v] satisfies [RI, Route<SI, RI, TI>];
          seen.add(k);
        }

        return undefined;
      }.bind(this),
    } satisfies IRAPTORData<SI, RI, TI>["routes"];
  }

  /**
   * @description Attach additional data that can be edited at any time.
   * Does not handle duplicate data.
   */
  attachData(stops: ArrayRead<Stop<SI, RI>>, routes: ArrayRead<ConstructorParameters<typeof Route<SI, RI, TI>>>) {
    this.attachedStops = new Map(stops.map((s) => [s.id, s]));
    this.attachedRoutes = new Map(routes.map(([rId, stopsIds, trips]) => [rId, new Route(rId, stopsIds, trips)] as const));
  }
}
