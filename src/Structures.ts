/**
 * A timestamp representation of a Date ; in milliseconds.
 */
type timestamp = number;
type Id = number | string;
type LabelType = "DEFAULT" | "DEPARTURE" | "FOOT" | "VEHICLE";

/**
 * General {@link Array} subpart, constrained to some read-only features.
 */
interface ArrayRead<T> {
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
interface MapRead<K, V> {
  [Symbol.iterator]: () => MapIterator<[K, V]>;
  get: (key: K) => V | undefined;
}

/**
 * @description A Trip, i.e. a succession of stop times.
 */
interface Trip<TI extends Id = Id> {
  id: TI;
  /**
   * @param stopTimes Time of arrival & departure at each stop.
   */
  times: ArrayRead<[timestamp, timestamp]>;
}

interface FootPath<SI extends Id> {
  to: SI;
  length: number;
}

/**
 * @description A Stop, i.e. a geographical specific point that is connected to routes.
 */
interface Stop<SI extends Id, RI extends Id> {
  readonly id: SI;
  readonly connectedRoutes: ArrayRead<RI>;
  readonly transfers: ArrayRead<FootPath<SI>>;
}

/**
 * @description A Route, i.e. a succession of geographical specific points (stops) alongside with their corresponding operated trips.
 */
class Route<SI extends Id, RI extends Id, TI extends Id = Id> {
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

interface Comparable<T> {
  /* Compares with another value `other`, returns `-1` if it's superior to `other`, `0` if equal, `1` otherwise */
  compare(other: T): -1 | 0 | 1;
}

/**
 * A bag, i.e. a set using a custom comparison function, keeping only minimal values.
 *
 * Warning: once added, elements in the set should not change -- no comparison and filtering would be done in such a case.
 */

type Tuple<T, L extends number, TU extends T[] = []> = TU extends { length: L } ? TU : Tuple<T, L, [...TU, T]>;
// type Length<TU extends unknown[]> = TU extends { length: infer L } ? L : never;
// type Add<A extends number, B extends number> = Length<[...Tuple<unknown, A>, ...Tuple<unknown, B>]>;

type Criterion = () => number;

/** A tuple of size N+1 (time + other criteria) */
class Label<N extends number> implements Comparable<Label<N>> {
  protected readonly values: [timestamp, ...Tuple<number, N>];

  constructor(
    protected readonly criteria: Tuple<Criterion, N>,
    time: number,
    values?: Tuple<number, N>,
  ) {
    this.values = [time, ...((values ?? Array.from({ length: (criteria as Criterion[]).length }, () => Infinity)) as Tuple<number, N>)];
  }

  get time() {
    return this.values[0];
  }

  updateTime(time: number) {
    return new Label<N>(this.criteria, time, this.values.slice(1) as Tuple<number, N>);
  }

  update(timeOrData: number | Parameters<Criterion>): Label<N>;
  update(time: number, data: never): Label<N>;
  update(timeOrData: number | Parameters<Criterion>, data?: Parameters<Criterion>) {
    return new Label<N>(
      this.criteria,
      typeof timeOrData === "number" ? timeOrData : this.values[0],
      timeOrData instanceof Array
        ? ((this.criteria as Criterion[]).map((f) => f(...timeOrData)) as Tuple<number, N>)
        : data
          ? ((this.criteria as Criterion[]).map((f) => f(...data)) as Tuple<number, N>)
          : (this.values.slice(1) as Tuple<number, N>),
    );
  }

  /**
   * Compares this label with another by checking criteria domination.
   * @param l The label to be compared with
   * @returns `-1` if this label is dominated by {@link l}, `0` if they are equal, `1` otherwise
   */
  compare(l: Label<N>): -1 | 0 | 1 {
    let inf: 0 | 1 = 0;
    for (const [i, v] of (this.values as number[]).entries()) {
      if (v > (l.values as number[])[i]) return -1;
      if (v < (l.values as number[])[i]) inf = 1;
    }

    return inf;
  }
}

type JourneyStep<SI extends Id, RI extends Id, N extends number, T extends LabelType = LabelType> = Comparable<JourneyStep<SI, RI, N>> & {
  label: Label<N>;
} & (T extends "VEHICLE"
    ? {
        /** @param boardedAt {@link SI} in {@link RAPTOR.stops} */
        boardedAt: SI;
        /** @param route {@link Route} in {@link RAPTOR.routes} */
        route: Route<SI, RI>;
        tripIndex: number;
      }
    : T extends "FOOT"
      ? {
          /** @param boardedAt {@link SI} in {@link RAPTOR.stops} */
          boardedAt: SI;
          /** @param boardedAt {@link SI} in {@link RAPTOR.stops} */
          transfer: FootPath<SI>;
        }
      : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        {});

function makeJSComparable<SI extends Id, RI extends Id, N extends number, T extends LabelType = LabelType>(
  partialJourneyStep: Omit<JourneyStep<SI, RI, N, T>, keyof Comparable<JourneyStep<SI, RI, N>>>,
): JourneyStep<SI, RI, N, T> {
  return { ...partialJourneyStep, compare: (js: JourneyStep<SI, RI, N>) => partialJourneyStep.label.compare(js.label) } as JourneyStep<SI, RI, N, T>;
}

type Journey<SI extends Id, RI extends Id, N extends number> = JourneyStep<SI, RI, N, "DEPARTURE" | "VEHICLE" | "FOOT">[];

class Bag<T extends Comparable<T>> {
  protected readonly inner: { val: T; dominated: boolean }[] = [];

  /**
   * Create (O(n)) a new bag from another.
   * Does NOT copy elements -- they have the same reference.
   * @param bag
   */
  static from<T extends Comparable<T>>(bag: InstanceType<typeof Bag<T>>): Bag<T> {
    const b = new Bag<T>();
    b.inner.push(...bag.inner);
    return b;
  }

  /**
   * O(1)
   */
  get size() {
    return this.inner.length;
  }

  /**
   * Adds (O(n)) an element in the bag, marking new dominated values but not removing them, see {@link add}.
   * @param el Element to add in the bag
   * @returns The bag itself
   */
  addOnly(el: T) {
    let inf = false;

    for (const v of this.inner)
      if (!v.dominated && el.compare(v.val) == 1) {
        inf = true;
        v.dominated = true;
      }

    if (inf) {
      this.inner.push({ val: el, dominated: false });
      return true;
    }

    return false;
  }

  /**
   * Removes (O(n^2)) dominated elements
   * @returns #Removed elements
   */
  prune() {
    const initialSize = this.size;

    let i = 0;
    while (i < this.size)
      if (this.inner[i].dominated) this.inner.splice(i, 1);
      else ++i;

    return this.size - initialSize;
  }

  /**
   * Adds (O(n^2)) an element in the bag, keeping only minimal values.
   * @param el Element to add in the bag
   * @returns The bag itself
   */
  add(el: T) {
    const added = this.addOnly(el);
    const pruned = this.prune();

    return { added, pruned };
  }

  /**
   * {@link add}s (O(n^2)) everything from another bag in this bag.
   * @param b Bag to merge from
   * @returns Number of added elements
   */
  merge(b: Bag<T>) {
    const initialSize = this.size;

    for (const elNew of b.inner) {
      if (!elNew.dominated) this.addOnly(elNew.val);
    }

    const pruned = this.prune();

    return { added: this.size - initialSize + pruned, pruned };
  }

  updateOnly(oldEl: T, newEl: T) {
    let idx: number | null = null;
    let dom = false;

    for (const [i, v] of this.inner.entries()) {
      if (v.val === oldEl) idx = i;
      else if (!v.dominated) {
        const cmp = newEl.compare(v.val);
        if (cmp == 1) v.dominated = true;
        if (cmp == -1) dom = true;
      }
    }

    if (idx) {
      this.inner[idx].val = newEl;
      this.inner[idx].dominated = dom;
    }

    return this;
  }

  update(oldEl: T, newEl: T) {
    this.updateOnly(oldEl, newEl);
    this.prune();

    return this;
  }

  *[Symbol.iterator]() {
    for (const v of this.inner) if (!v.dominated) yield v.val;
  }
}

interface IRAPTORData<SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> {
  readonly MAX_SAFE_TIMESTAMP: number;
  readonly stops: MapRead<SI, Stop<SI, RI>>;
  readonly routes: MapRead<RI, Route<SI, RI, TI>>;
  attachData: (...args: never[]) => void;
}

class RAPTORData<SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> implements IRAPTORData<SI, RI, TI> {
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
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          yield [k, this.getStop(k)!] satisfies [SI, Stop<SI, RI>];
          seen.add(k);
        }

        for (const [k, v] of this.attachedStops) {
          if (seen.has(k)) continue;

          yield [k, v] satisfies [SI, Stop<SI, RI>];
          // No need to add to `seen` : considering no duplication inside `attachedStops`
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
          // No need to check in `seen` : considering no duplication inside `this._routes`

          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          yield [k, this.getRoute(k)!] satisfies [RI, Route<SI, RI, TI>];
          seen.add(k);
        }

        for (const [k, v] of this.attachedRoutes) {
          if (seen.has(k)) continue;

          yield [k, v] satisfies [RI, Route<SI, RI, TI>];
          // No need to add to `seen` : considering no duplication inside `attachedRoutes`
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

export {
  timestamp,
  Id,
  LabelType,
  Label,
  JourneyStep,
  makeJSComparable,
  Journey,
  Criterion,
  Bag,
  Trip,
  FootPath,
  Stop,
  Route,
  ArrayRead,
  MapRead,
  RAPTORData,
  IRAPTORData,
  Tuple,
};
