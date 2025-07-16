import { Ordered, Time } from "./time";

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
interface Trip<TimeVal, TI extends Id = Id> {
  id: TI;
  /**
   * @param times Time of arrival & departure at each stop.
   */
  times: ArrayRead<[TimeVal, TimeVal]>;
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
class Route<TimeVal, SI extends Id, RI extends Id, TI extends Id = Id> {
  /**
   * @description Creates a new Route. Note that stops and trips are linked : they are cross-connected.
   */
  constructor(
    readonly id: RI,
    readonly stops: ArrayRead<SI>,
    readonly trips: ArrayRead<Trip<TimeVal, TI>>,
  ) {}

  /**
   * @description Computes the departure time on a trip at stop p.
   * @param t Trip index in route.
   * @param p Stop index in route (trip).
   */
  departureTime(t: number, p: number): TimeVal {
    const time = this.trips.at(t)?.times.at(p)?.[1];
    if (time === undefined) throw new Error(`No departure time for stop at index ${p} in trip at index ${t} (indexes out of bounds?).`);

    return time;
  }
}

interface Comparable<T> {
  /**
   * @param compare Compares with another value `other`, returns `< 0` if it's superior to `other`, `0` if equal, `> 0` if inferior, and `null` if not comparable
   */
  compare(other: T): number | null;
}

interface Criterion<TimeVal, SI extends Id, RI extends Id, T, N extends string> extends Ordered<T> {
  name: N;
  /** Usually 0, +/-Infinity or 1 */
  initialValue: T;
  update: (
    prefixJourney: Journey<TimeVal, SI, RI, T, [[T, N]]>,
    newJourneyStep: Omit<JourneyStep<TimeVal, SI, RI, T, [[T, N]]>, "label" | keyof Comparable<never>>,
    timeType: Time<TimeVal>,
    time: TimeVal,
    stop: SI,
  ) => T;
}

/** A tuple of size N+1 (time + other criteria) */
class Label<TimeVal, SI extends Id, RI extends Id, V, CA extends [V, string][]> implements Comparable<Label<TimeVal, SI, RI, V, CA>> {
  protected readonly values: Record<CA[number][1], CA[number][0]> & { time: TimeVal };

  constructor(
    protected readonly timeType: Time<TimeVal>,
    readonly criteria: { [K in keyof CA]: Criterion<TimeVal, SI, RI, CA[K][0], CA[K][1]> }, //, K
    time: TimeVal,
  ) {
    this.values = criteria.reduce<Partial<Label<TimeVal, SI, RI, V, CA>["values"]>>((acc, v) => ({ ...acc, [v.name]: v.initialValue }), {
      time,
    } as Partial<Label<TimeVal, SI, RI, V, CA>["values"]>) as Label<TimeVal, SI, RI, V, CA>["values"];
  }

  get time() {
    return this.values.time;
  }

  value<C extends CA[number]>(criterionName: C[1]): C[0] {
    return this.values[criterionName] as C[0];
  }

  update(time: TimeVal, data: Parameters<Criterion<TimeVal, SI, RI, CA[number][0], CA[number][1]>["update"]>) {
    const updated = new Label<TimeVal, SI, RI, V, CA>(this.timeType, this.criteria, time);
    for (const c of this.criteria as Criterion<TimeVal, SI, RI, V, CA[number][1]>[])
      (updated.values as Record<CA[number][1], CA[number][0]>)[c.name] = c.update(...data);

    return updated;
  }

  /**
   * Compares this label with another by checking criteria domination.
   * @param l The label to be compared with
   * @returns `-1` if this label is dominated by {@link l}, `0` if they are equal, `1` otherwise
   */
  compare(l: Label<TimeVal, SI, RI, V, CA>) {
    // Has `l` an inferior criterion ?
    let inf: 0 | -1 = 0;
    // Has `l` a superior criterion ?
    let sup: 0 | 1 = 0;

    if (this.timeType.order(this.time, l.time) > 0) inf = -1;
    if (this.timeType.order(this.time, l.time) < 0) sup = 1;

    for (const c of this.criteria as Criterion<TimeVal, SI, RI, V, CA[number][1]>[]) {
      if (c.order(this.values[c.name], l.values[c.name]) > 0) inf = -1;
      if (c.order(this.values[c.name], l.values[c.name]) < 0) sup = 1;
    }

    return inf && sup ? null : inf || sup;
  }
}

type JourneyStep<
  TimeVal,
  SI extends Id,
  RI extends Id,
  V,
  CA extends [V, string][],
  T extends LabelType = LabelType,
  F extends boolean = false,
> = Comparable<JourneyStep<TimeVal, SI, RI, V, CA>> & {
  label: Label<TimeVal, SI, RI, V, CA>;
} & (T extends "VEHICLE"
    ? {
        /** @param boardedAt {@link SI} in {@link RAPTOR.stops} */
        boardedAt: F extends true ? SI : [SI, JourneyStep<TimeVal, SI, RI, V, CA>];
        /** @param route {@link Route} in {@link RAPTOR.routes} */
        route: Route<TimeVal, SI, RI>;
        tripIndex: number;
      }
    : T extends "FOOT"
      ? {
          /** @param boardedAt {@link SI} in {@link RAPTOR.stops} */
          boardedAt: F extends true ? SI : [SI, JourneyStep<TimeVal, SI, RI, V, CA>];
          /** @param transfer {@link FootPath<SI>} in {@link RAPTOR.stops} */
          transfer: FootPath<SI>;
        }
      : // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        {});

function makeJSComparable<TimeVal, SI extends Id, RI extends Id, V, CA extends [V, string][], T extends LabelType = LabelType>(
  partialJourneyStep: Omit<JourneyStep<TimeVal, SI, RI, V, CA, T>, keyof Comparable<JourneyStep<TimeVal, SI, RI, V, CA>>>,
): JourneyStep<TimeVal, SI, RI, V, CA, T> {
  return { ...partialJourneyStep, compare: (js: JourneyStep<TimeVal, SI, RI, V, CA>) => partialJourneyStep.label.compare(js.label) } as JourneyStep<
    TimeVal,
    SI,
    RI,
    V,
    CA,
    T
  >;
}

type Journey<TimeVal, SI extends Id, RI extends Id, V, CA extends [V, string][]> = JourneyStep<
  TimeVal,
  SI,
  RI,
  V,
  CA,
  "DEPARTURE" | "VEHICLE" | "FOOT",
  true
>[];

/**
 * A bag, i.e. a set using a custom comparison function, keeping only minimal values.
 *
 * Warning: once added, elements in the set should not change -- no comparison and filtering would be done in such a case.
 */
class Bag<T extends Comparable<T>> {
  protected readonly inner: { val: T; dominated: boolean }[] = [];

  /**
   * Create (O(n)) a new bag from another.
   * Does NOT copy elements -- they have the same reference.
   * @param bag
   */
  static from<T extends Comparable<T>>(bag: InstanceType<typeof Bag<T>>): Bag<T> {
    const b = new Bag<T>();
    b.inner.push(
      ...bag.inner.map(({ val, dominated }) => ({
        val,
        dominated,
      })),
    );
    return b;
  }

  /**
   * O(n)...
   */
  get size() {
    return this.values().toArray().length;
  }

  /**
   * Adds (O(n)) an element in the bag, marking new dominated values but not removing them, see {@link add}.
   * @param el Element to add in the bag
   * @returns Wether the element has been added or not
   */
  addOnly(el: T) {
    let alreadyHaveBetter = false;

    for (const v of this.inner)
      if (!v.dominated) {
        const cmp = el.compare(v.val);
        if (cmp === 1) v.dominated = true;
        else if (cmp !== null && cmp <= 0) alreadyHaveBetter = true;
      }

    if (!alreadyHaveBetter) {
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
    const initialLength = this.inner.length;

    let i = 0;
    while (i < this.inner.length)
      if (this.inner[i].dominated) this.inner.splice(i, 1);
      else ++i;

    return initialLength - this.inner.length;
  }

  /**
   * Adds (O(n^2)) an element in the bag, keeping only minimal values.
   * @param el Element to add in the bag
   * @returns Wether the element has been added or not, the number of pruned elements
   */
  add(el: T) {
    const added = this.addOnly(el);
    const pruned = this.prune();

    return { added, pruned };
  }

  /**
   * {@link add}s (O(n^2)) everything from another bag in this bag.
   * @param b Bag to merge from
   * @returns Number of added and pruned elements
   */
  merge(b: Bag<T>) {
    const initialSize = this.size;

    for (const elNew of b.inner) if (!elNew.dominated) this.addOnly(elNew.val);

    const pruned = this.prune();

    return { added: this.size - initialSize + pruned, pruned };
  }

  /**
   * Updates an element in the bag, marking dominated elements
   * @param oldEl Element to update currently in the bag
   * @param newEl New element to put in its place
   * @returns Wether the updated element is now dominated or not
   */
  updateOnly(oldEl: T, newEl: T) {
    let idx: number | null = null;
    let dom = false;

    for (const [i, v] of this.inner.entries()) {
      if (v.val === oldEl) idx = i;
      else {
        const cmp = newEl.compare(v.val);
        if (cmp == 1) v.dominated = true;
        if (cmp == -1) dom = true;
      }
    }

    if (idx !== null) {
      this.inner[idx].val = newEl;
      this.inner[idx].dominated = dom;
    }

    return dom;
  }

  /**
   * Updates an element in the bag, removing it if it's being dominated, and removing possible dominated elements
   * @param oldEl Element to update currently in the bag
   * @param newEl New element to put in its place
   * @returns Number of pruned elements, possibly including the updated element
   */
  update(oldEl: T, newEl: T) {
    this.updateOnly(oldEl, newEl);
    const pruned = this.prune();

    return pruned;
  }

  *[Symbol.iterator]() {
    for (const v of this.inner) if (!v.dominated) yield v.val;
  }

  values() {
    return this[Symbol.iterator]();
  }
}

interface IRAPTORData<TimeVal, SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> {
  readonly timeType: Time<TimeVal>;
  readonly stops: MapRead<SI, Stop<SI, RI>>;
  readonly routes: MapRead<RI, Route<TimeVal, SI, RI, TI>>;
  attachStops: (...args: never[]) => void;
}

class RAPTORData<TimeVal, SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> implements IRAPTORData<TimeVal, SI, RI, TI> {
  readonly _stops: MapRead<SI, Stop<SI, RI>>;
  readonly _routes: MapRead<RI, Route<TimeVal, SI, RI, TI>>;
  protected attachedStops: MapRead<SI, Stop<SI, RI>> = new Map();
  protected attachedRoutes: MapRead<RI, Route<TimeVal, SI, RI, TI>> = new Map();

  /**
   * @description Creates a new RAPTORData instance for a defined network.
   */
  constructor(
    readonly timeType: Time<TimeVal>,
    stops: ArrayRead<Stop<SI, RI>>,
    routes: ArrayRead<ConstructorParameters<typeof Route<TimeVal, SI, RI, TI>>>,
  ) {
    this._stops = new Map(
      stops.map(({ id, connectedRoutes, transfers }) => [
        id,
        { id, connectedRoutes, transfers: Array.from(transfers).sort((a, b) => a.length - b.length) },
      ]),
    );
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
      get: (key: SI) => this.getStop(key),
      [Symbol.iterator]: function* (this: RAPTORData<TimeVal, SI, RI, TI>) {
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
    };
  }

  protected getRoute(key: RI) {
    const original = this._routes.get(key);
    const attached = this.attachedRoutes.get(key);
    if (!original && !attached) return undefined;

    // Merge data
    return new Route<TimeVal, SI, RI, TI>(
      key,
      [...(original?.stops ?? []), ...(attached?.stops ?? [])],
      [...(original?.trips ?? []), ...(attached?.trips ?? [])],
    );
  }

  get routes() {
    return this._routes;
  }

  /**
   * @description Attach additional data that can be edited at any time.
   * O(whole data, base + attached)
   * Does not handle duplicate data.
   */
  attachStops(stops: ArrayRead<ConstructorParameters<typeof Stop<SI, RI>>>) {
  }
}

export {
  ArrayRead,
  Bag,
  Criterion,
  FootPath,
  Id,
  IRAPTORData,
  Journey,
  JourneyStep,
  Label,
  LabelType,
  makeJSComparable,
  MapRead,
  RAPTORData,
  Route,
  Stop,
  Trip,
};
