import { FootPath, Stop, Trip, Route } from "./Structures";

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
class ArrayView<T> {
  constructor(
    /**
     * Length of array
     */
    protected readonly length: number,
    /**
     * Accessor to an array element at index `idx`
     */
    protected readonly _get: (idx: number) => T,
    protected readonly _equal: (a: T, b: T) => boolean,
  ) {
    // Make an instance of ArrayView hook-getable
    return new Proxy(this, {
      get: (_, prop) => this.get(typeof prop === "string" ? parseInt(prop) : NaN),
    });
  }

  /**
   * Same as hooked-access `[]` to an array.
   * Throws over {@link ArrayView._get}.
   * @param idx Index of element to access, must be positive and strictly inferior to array length
   */
  get(idx: number): T {
    // Throws instead of returning undefined (for a Map)
    if (isNaN(idx) || idx < 0 || idx >= this.length) throw new Error("Invalid access");
    return this._get(idx);
  }

  /**
   * Same as {@link Array.prototype[Symbol.iterator]}
   */
  *[Symbol.iterator]() {
    for (let idx = 0; idx < this.length; idx++) yield this._get(idx);
  }

  /**
   * Same as {@link Array.prototype.indexOf}
   */
  indexOf(el: T, fromIndex = 0): number {
    for (; fromIndex < this.length; fromIndex++) if (this._equal(this._get(fromIndex), el)) return fromIndex;
    return -1;
  }
}

enum PtrType {
  Stop,
  Route,
}

/**
 * A DataView built on top of {@link RAPTORData} internals to ease & enhance data manipulation
 */
class Retriever<T extends PtrType> {
  constructor(
    /**
     * View on stops, same as {@link RAPTORData.sDataView}
     */
    protected readonly sDataView: Uint32Array,
    /**
     * View on routes, same as {@link RAPTORData.rDataView}
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
  connectedRoutes: ArrayView<RouteRetriever>;
  transfers: ArrayView<FootPathRetriever>;
}

class StopRetriever extends Retriever<PtrType.Stop> implements Override<Stop<number, number>, SharedStop> {
  get id() {
    return this.sDataView[this.ptr];
  }

  get connectedRoutes() {
    return new ArrayView(
      this.sDataView[this.ptr + 1],
      (idx) => new RouteRetriever(this.sDataView, this.rDataView, this.sDataView[this.ptr + 1 + idx + 1], PtrType.Route),
      (a, b) => a.id === b.id,
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
   * Length 2 : `[arrival timestamp, departure timestamp]`
   */
  times: ArrayView<Uint32Array>;
}

class TripRetriever extends Retriever<PtrType.Route> implements Override<Trip<number>, SharedTrip> {
  get id() {
    return this.rDataView[this.ptr];
  }

  get times() {
    return new ArrayView(
      this.rDataView[this.ptr + 1],
      (idx) => this.rDataView.subarray(this.ptr + 2 + idx, this.ptr + 2 + idx + 2 + 1),
      (a, b) => a.byteOffset === b.byteOffset && a.length === b.length && a.buffer === b.buffer,
    );
  }
}

//
// Route
//

interface SharedRoute {
  stops: ArrayView<StopRetriever>;
  trips: ArrayView<TripRetriever>;
}

class RouteRetriever extends Retriever<PtrType.Route> implements Override<Route<number, number, number>, SharedRoute> {
  get id() {
    return this.rDataView[this.ptr];
  }

  get stops() {
    return new ArrayView(
      this.rDataView[this.ptr + 1],
      (idx) => new StopRetriever(this.sDataView, this.rDataView, this.rDataView[this.ptr + 2 + idx], PtrType.Stop),
      (a, b) => a.id === b.id,
    );
  }

  get trips() {
    return new ArrayView(
      this.rDataView[this.ptr + 1 + this.rDataView[this.ptr + 1] + 1],
      (idx) =>
        new TripRetriever(this.sDataView, this.rDataView, this.rDataView[this.ptr + 1 + this.rDataView[this.ptr + 1] + 1 + 1 + idx], PtrType.Route),
      (a, b) => a.id === b.id,
    );
  }

  departureTime(t: number, p: number): number {
    return this.trips.get(t).times.get(p)[1];
  }
}

/**
 * Shared-memory enabled RAPTOR data
 */
export class RAPTORData {
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
   * @param data Instantiate from {@link RAPTORData.prototype.internalData} exported data
   */
  protected constructor(data: typeof RAPTORData.prototype.internalData);
  protected constructor(stops: Stop<number, number>[], routes: ConstructorParameters<typeof Route<number, number, number>>[]);
  protected constructor(
    stopsOrData: typeof RAPTORData.prototype.internalData | Stop<number, number>[],
    routes?: ConstructorParameters<typeof Route<number, number, number>>[],
  ) {
    // Assign data storage
    this.data =
      "data" in stopsOrData
        ? stopsOrData.data
        : new SharedArrayBuffer(
            // Compute total data size (length for buffer), no grow needed
            // Size of stops buffer chunk
            1 +
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
              ),
          );

    // Stops length in data buffer
    const stopsDataLength = new DataView(this.data);
    const getStopsDataLength = () => stopsDataLength.getUint32(0);
    const setStopsDataLength = (length: number) => stopsDataLength.getUint32(length);

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
    return new RAPTORData(stops, routes);
  }

  static makeFromInternalData(data: typeof RAPTORData.prototype.internalData) {
    return new RAPTORData(data);
  }

  get stops() {
    return {
      [Symbol.iterator]: function* (this: RAPTORData) {
        for (let ptr = 0; ptr < this.sDataView.length; ptr += 3 + this.sDataView[ptr + 1] + this.sDataView[ptr + 1 + this.sDataView[ptr + 1] + 1]) {
          /**
           * Pointer (index in buffer) to stop, retrieve it through `get` method.
           */
          yield ptr;
        }
      }.bind(this),
      /**
       * Maps a stop pointer to its corresponding {@link StopRetriever}
       * @param ptr Pointer to a stop
       */
      get: (ptr: number) => new StopRetriever(this.sDataView, this.rDataView, ptr, PtrType.Stop),
    };
  }

  get routes() {
    return {
      [Symbol.iterator]: function* (this: RAPTORData) {
        for (let ptr = 0; ptr < this.rDataView.length; ptr += 3 + this.rDataView[ptr + 1] + this.rDataView[ptr + 1 + this.rDataView[ptr + 1] + 1]) {
          /**
           * Pointer (index in buffer) to route, retrieve it through `get` method.
           */
          yield ptr;
        }
      }.bind(this),
      /**
       * Maps a route pointer to its corresponding {@link RouteRetriever}
       * @param ptr Pointer to a route
       */
      get: (ptr: number) => new RouteRetriever(this.sDataView, this.rDataView, ptr, PtrType.Route),
    };
  }
}
