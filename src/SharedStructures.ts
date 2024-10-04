import { FootPath, Stop, Trip, Route, ArrayRead, MapRead } from "./Structures";

/**
 * Helper type to override type `T` with type `O`
 */
type Override<T, O> = Omit<T, keyof O> & O;

/**
 * Helper type for viewing-only arrays, with some viewing methods of {@link Array}.
 * Hook-getable :
 * ```
 * const inst = new ArrayView(...);
 * console.log(inst[0]); // Works !
 * ```
 */
export class ArrayView<T> implements ArrayRead<T> {
  [x: number]: T;

  constructor(
    /**
     * Length of array
     */
    readonly length: number,
    /**
     * Accessor to an array element at index `idx`
     */
    protected readonly _get: (idx: number) => T,
    protected readonly _equal: (a: T, b: T) => boolean,
  ) {
    // Make an instance of ArrayView hook-getable
    return new Proxy(this, {
      get: (_, prop) => {
        if (typeof prop === "string") {
          const idx = parseInt(prop);
          if (!isNaN(idx)) return this.get(idx);
        }

        // Just continue calling
        return (this as Record<typeof prop, unknown>)[prop];
      },
    });
  }

  /**
   * Same as hooked-access `[]` to an array.
   * Throws over {@link ArrayView._get}.
   * @param idx Index of element to access, must be positive and strictly inferior to array length
   */
  protected get(idx: number): T {
    // Throws instead of returning undefined (for a Map)
    if (isNaN(idx) || idx < 0 || idx >= this.length) {
      console.log(isNaN(idx), idx < 0, idx >= this.length);
      throw new Error("Invalid access");
    }
    return this._get(idx);
  }

  /**
   * Same as {@link Array.prototype[Symbol.iterator]}
   */
  *[Symbol.iterator]() {
    for (let idx = 0; idx < this.length; idx++) yield this._get(idx);

    return undefined;
  }

  /**
   * Same as {@link Array.prototype.indexOf}
   */
  indexOf(el: T, fromIndex = 0): number {
    for (; fromIndex < this.length; fromIndex++) if (this._equal(this._get(fromIndex), el)) return fromIndex;
    return -1;
  }

  map<U>(callbackfn: (value: T, index: number, array: ArrayRead<T>) => U): ArrayRead<U> {
    const acc: U[] = [];
    for (let idx = 0; idx < this.length; idx++) acc.push(callbackfn(this._get(idx), idx, this));
    return acc;
  }

  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: ArrayRead<T>) => U, initialValue: U): U {
    for (let idx = 0; idx < this.length; idx++) callbackfn(initialValue, this._get(idx), idx, this);
    return initialValue;
  }
}

enum PtrType {
  Stop,
  Route,
}

/**
 * A DataView built on top of {@link SharedRAPTORData} internals to ease & enhance data manipulation
 */
class Retriever<T extends PtrType> {
  constructor(
    /**
     * View on stops, same as {@link SharedRAPTORData.sDataView}
     */
    protected readonly sDataView: Uint32Array,
    /**
     * View on routes, same as {@link SharedRAPTORData.rDataView}
     */
    protected readonly rDataView: Uint32Array,
    // Not readonly : a pointer is already often exposed, and moreover, permits access in O(1) without any overhead
    readonly ptr: number,
    readonly ptrType: T,
  ) {
    // Runtime check
    if ((ptrType === PtrType.Stop && ptr >= sDataView.length) || (ptrType === PtrType.Route && ptr >= rDataView.length))
      throw new Error("Pointer out of range");
  }
}

//
// FootPath
//

class FootPathRetriever extends Retriever<PtrType.Stop> implements FootPath<number> {
  get to() {
    return this.sDataView[this.ptr];
  }

  get length() {
    return this.sDataView[this.ptr + 1];
  }

  static equals(a: InstanceType<typeof FootPathRetriever>, b: InstanceType<typeof FootPathRetriever>) {
    return a.ptr === b.ptr;
  }
}

//
// Stop
//

interface SharedStop {
  /**
   * Array of route pointers
   */
  connectedRoutes: ArrayView<number>;
  transfers: ArrayView<FootPathRetriever>;
}

class StopRetriever extends Retriever<PtrType.Stop> implements Override<Stop<number, number>, SharedStop> {
  get id() {
    return this.sDataView[this.ptr];
  }

  get connectedRoutes() {
    return new ArrayView(
      this.sDataView[this.ptr + 1],
      (idx) => this.ptr + 1 + idx + 1,
      (a, b) => a === b,
    );
  }

  get transfers() {
    return new ArrayView(
      this.sDataView[this.ptr + 1 + this.sDataView[this.ptr + 1] + 1],
      (idx) =>
        new FootPathRetriever(
          this.sDataView,
          this.rDataView,
          this.sDataView[this.ptr + 1 + this.sDataView[this.ptr + 1] + 1 + 1 + idx],
          PtrType.Stop,
        ),
      (a, b) => FootPathRetriever.equals(a, b),
    );
  }
}

//
// Trip
//

interface SharedTrip {
  /**
   * Length 2 : `[arrival timestamp, departure timestamp]`.
   * Defined as `[number, number]` to match {@link Trip} interface, but is in fact a `Uint32Array`
   */
  times: ArrayRead<[number, number]>;
}

class TripRetriever extends Retriever<PtrType.Route> implements Override<Trip<number>, SharedTrip> {
  get id() {
    return this.rDataView[this.ptr];
  }

  get times() {
    return new ArrayView(
      this.rDataView[this.ptr + 1],
      (idx) => this.rDataView.subarray(this.ptr + 2 + idx, this.ptr + 2 + idx + 2) as unknown as [number, number],
      (a, b) =>
        (a as unknown as Uint32Array).byteOffset === (b as unknown as Uint32Array).byteOffset &&
        a.length === b.length &&
        (a as unknown as Uint32Array).buffer === (b as unknown as Uint32Array).buffer,
    );
  }
}

//
// Route
//

interface SharedRoute {
  /**
   * Array of stop pointers
   */
  stops: ArrayView<number>;
  trips: ArrayView<Override<Trip<number>, SharedTrip>>;
}

class RouteRetriever extends Retriever<PtrType.Route> implements Override<Route<number, number, number>, SharedRoute> {
  get id() {
    return this.rDataView[this.ptr];
  }

  get stops() {
    return new ArrayView(
      this.rDataView[this.ptr + 1],
      (idx) => this.ptr + 2 + idx,
      (a, b) => a === b,
    );
  }

  get trips() {
    return new ArrayView<Override<Trip<number>, SharedTrip>>(
      this.rDataView[this.ptr + 1 + this.rDataView[this.ptr + 1] + 1],
      (idx) =>
        new TripRetriever(this.sDataView, this.rDataView, this.rDataView[this.ptr + 1 + this.rDataView[this.ptr + 1] + 1 + 1 + idx], PtrType.Route),
      (a, b) => a.id === b.id,
    );
  }

  departureTime(t: number, p: number): number {
    return this.trips[t].times[p][1];
  }
}

/**
 * Shared-memory enabled RAPTOR data
 */
export class SharedRAPTORData {
  // Max uint32
  static readonly MAX_SAFE_TIMESTAMP: number = 4_294_967_295;
  readonly MAX_SAFE_TIMESTAMP: number = SharedRAPTORData.MAX_SAFE_TIMESTAMP;
  /**
   * Internal data (shared) buffer
   */
  protected data: SharedArrayBuffer;
  /**
   * View on stops
   */
  protected sDataView: Uint32Array;
  /**
   * View on routes
   */
  protected rDataView: Uint32Array;

  /**
   *
   * @param data Instantiate from {@link SharedRAPTORData.prototype.internalData} exported data
   */
  protected constructor(data: typeof SharedRAPTORData.prototype.internalData);
  protected constructor(stops: Stop<number, number>[], routes: ConstructorParameters<typeof Route<number, number, number>>[]);
  protected constructor(
    stopsOrData: typeof SharedRAPTORData.prototype.internalData | Stop<number, number>[],
    routes?: ConstructorParameters<typeof Route<number, number, number>>[],
  ) {
    // Assign data storage
    this.data =
      "data" in stopsOrData
        ? stopsOrData.data
        : new SharedArrayBuffer(
            // Compute total data size (length for buffer), no grow needed
            // Size of stops buffer chunk
            (1 +
              stopsOrData.reduce<number>(
                (acc, v) =>
                  acc +
                  // stop id
                  1 +
                  // length of connected routes chunk
                  (1 +
                    // connected routes chunk
                    v.connectedRoutes.length) +
                  // length of transfers chunk
                  (1 +
                    // transfers chunk
                    v.transfers.length * 2),
                0,
              ) +
              routes!.reduce<number>(
                (acc, [_, stops, trips]) =>
                  acc +
                  // route id
                  1 +
                  // length of stops chunk
                  (1 +
                    // stops chunk
                    stops.length) +
                  // length of trips chunk
                  (1 +
                    // trips chunk
                    trips.reduce<number>(
                      (acc, v) =>
                        acc +
                        // trip id
                        1 +
                        // length of trip times chunk
                        1 +
                        // trip times chunk
                        v.times.length * 2,
                      0,
                    )),
                0,
              )) *
              Uint32Array.BYTES_PER_ELEMENT,
          );

    // Stops length in data buffer
    const stopsDataLength = new DataView(this.data);
    const getStopsDataLength = () => stopsDataLength.getUint32(0);
    const setStopsDataLength = (length: number) => stopsDataLength.setUint32(0, length);

    if ("data" in stopsOrData) {
      // Just make views
      this.sDataView = new Uint32Array(this.data, Uint32Array.BYTES_PER_ELEMENT * 1, getStopsDataLength());
      this.rDataView = new Uint32Array(this.data, Uint32Array.BYTES_PER_ELEMENT * getStopsDataLength());
    } else {
      //
      //Stops
      //

      this.sDataView = new Uint32Array(this.data, Uint32Array.BYTES_PER_ELEMENT * 1);
      let idx = 0;

      /**
       * Effective mapping from a stop number to its position in stop data buffer.
       * Maps `<stopId, stopIndex>` - `stopIndex` acts as a pointer
       */
      const sMapping = new Map<number, number>();

      for (const stop of stopsOrData) {
        sMapping.set(stop.id, idx);
        this.sDataView[idx++] = stop.id;

        this.sDataView[idx++] = stop.connectedRoutes.length;
        // Store ID first, then convert to ptr
        for (const connectedRoute of stop.connectedRoutes) this.sDataView[idx++] = connectedRoute;

        // Total length of transfers chunk
        this.sDataView[idx++] = stop.transfers.length * 2;
        for (const transfer of stop.transfers) {
          // Store ID first, then convert to ptr
          this.sDataView[idx++] = transfer.to;
          this.sDataView[idx++] = transfer.length;
        }

        setStopsDataLength(idx);
      }

      // Correct length of view
      this.sDataView = new Uint32Array(this.data, Uint32Array.BYTES_PER_ELEMENT * 1, getStopsDataLength());

      //
      // Routes
      //

      this.rDataView = new Uint32Array(this.data, Uint32Array.BYTES_PER_ELEMENT * getStopsDataLength());
      idx = 0;

      /**
       * Effective mapping from a route number to its position in route data buffer.
       * Maps `<routeId, routeIndex>` - `routeIndex` acts as a pointer
       */
      const rMapping = new Map<number, number>();

      // `routes` must be defined or no constructor call would have matched
      for (const [id, stops, trips] of routes!) {
        rMapping.set(id, idx);
        this.rDataView[idx++] = id;

        this.rDataView[idx++] = stops.length;
        for (const stop of stops) {
          const stopPtr = sMapping.get(stop);
          if (stopPtr) this.rDataView[idx++] = stopPtr;
        }

        // Length of trips chunk
        const tripsChunkLengthIdx = idx++;
        for (const trip of trips) {
          this.rDataView[idx++] = trip.id;

          // Trip times length
          this.rDataView[idx++] = trip.times.length * 2;
          for (const timePair of trip.times) {
            this.rDataView.set(timePair, idx);
            idx += 2;
          }
        }
        this.rDataView[tripsChunkLengthIdx] = idx - tripsChunkLengthIdx;
      }

      // Second iteration to resolve route pointers in stop connectedRoutes
      for (idx = 0; idx < this.sDataView.length; idx++) {
        // First int is stop id -- ignore : start at idx + 1
        idx++;

        // Second is length of connectedRoutes
        const connectedRoutesLength = this.sDataView[idx];
        // Start at idx + 1 to skip this length
        for (idx++; idx < connectedRoutesLength; idx++) {
          // Get & set corresponding route pointer (index)
          const routePtr = rMapping.get(this.sDataView[idx]);
          if (routePtr) this.sDataView[idx] = routePtr;
        }

        // Current idx is total length of transfers
        const transfersLength = this.sDataView[idx];
        // Start at idx + 1 to skip this length
        // Increment of 2 each time : to & length attr
        for (idx++; idx < transfersLength; idx += 2) {
          // Get & set corresponding stop pointer (index)
          const stopPtr = sMapping.get(this.sDataView[idx]);
          if (stopPtr) this.sDataView[idx] = stopPtr;
        }

        // Now current ptr (idx) is back to new stop id
      }
    }
  }

  get internalData() {
    return {
      // Only need for the moment
      data: this.data,
    };
  }

  static makeFromRawData(stops: Stop<number, number>[], routes: ConstructorParameters<typeof Route<number, number, number>>[]) {
    return new SharedRAPTORData(stops, routes);
  }

  static makeFromInternalData(data: typeof SharedRAPTORData.prototype.internalData) {
    return new SharedRAPTORData(data);
  }

  get stops(): MapRead<number, StopRetriever> {
    return {
      [Symbol.iterator]: function* (this: SharedRAPTORData) {
        for (let ptr = 0; ptr < this.sDataView.length; ptr += 3 + this.sDataView[ptr + 1] + this.sDataView[ptr + 1 + this.sDataView[ptr + 1] + 1]) {
          /**
           * Pointer (index in buffer) to stop, retrieve it through `get` method.
           */
          yield [ptr, new StopRetriever(this.sDataView, this.rDataView, ptr, PtrType.Stop)] satisfies [unknown, unknown];
        }

        return undefined;
      }.bind(this),
      /**
       * Maps a stop pointer to its corresponding {@link StopRetriever}
       * @param ptr Pointer to a stop
       */
      get: (ptr: number) => new StopRetriever(this.sDataView, this.rDataView, ptr, PtrType.Stop),
    };
  }

  get routes(): MapRead<number, RouteRetriever> {
    return {
      [Symbol.iterator]: function* (this: SharedRAPTORData) {
        for (let ptr = 0; ptr < this.rDataView.length; ptr += 3 + this.rDataView[ptr + 1] + this.rDataView[ptr + 1 + this.rDataView[ptr + 1] + 1]) {
          /**
           * Pointer (index in buffer) to route, retrieve it through `get` method.
           */
          yield [ptr, new RouteRetriever(this.sDataView, this.rDataView, ptr, PtrType.Route)] satisfies [unknown, unknown];
        }

        return undefined;
      }.bind(this),
      /**
       * Maps a route pointer to its corresponding {@link RouteRetriever}
       * @param ptr Pointer to a route
       */
      get: (ptr: number) => new RouteRetriever(this.sDataView, this.rDataView, ptr, PtrType.Route),
    };
  }
}
