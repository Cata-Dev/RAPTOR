import { FootPath, Stop, Trip, Route, ArrayRead, MapRead } from "./Structures";

/**
 * Helper type to override type `T` with type `O`
 */
type Override<T, O> = Omit<T, keyof O> & O;

/**
 * Helper type for viewing-only arrays, with some viewing methods of {@link Array}.
 */
export class ArrayView<T> implements ArrayRead<T> {
  _length: number | null = null;

  constructor(
    /**
     * Length of array
     */
    protected readonly _lengthFn: () => number,
    /**
     * Accessor to an array element at index `idx`
     */
    protected readonly _at: (idx: number) => T,
    protected readonly _equal: (a: T, b: T) => boolean,
  ) {}

  get length() {
    return (this._length ??= this._lengthFn());
  }

  /**
   * Same as hooked-access `[]` to an array.
   * Throws over {@link ArrayView._at}.
   * @param idx Index of element to access, must be positive and strictly inferior to array length
   */
  at(idx: number): T {
    // Throws instead of returning undefined (for a Map)
    if (isNaN(idx) || idx < 0 || idx >= this.length) {
      throw new Error("Invalid access");
    }

    return this._at(idx);
  }

  /**
   * Same as {@link Array.prototype[Symbol.iterator]}
   */
  *[Symbol.iterator]() {
    for (let idx = 0; idx < this.length; idx++) yield this._at(idx);

    return undefined;
  }

  /**
   * Same as {@link Array.prototype.indexOf}
   */
  indexOf(el: T, fromIndex = 0): number {
    for (; fromIndex < this.length; fromIndex++) if (this._equal(this._at(fromIndex), el)) return fromIndex;
    return -1;
  }

  map<U>(callbackfn: (value: T, index: number, array: ArrayRead<T>) => U): ArrayRead<U> {
    const acc: U[] = [];
    for (let idx = 0; idx < this.length; idx++) acc.push(callbackfn(this._at(idx), idx, this));
    return acc;
  }

  reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: ArrayRead<T>) => U, initialValue: U): U {
    for (let idx = 0; idx < this.length; idx++) callbackfn(initialValue, this._at(idx), idx, this);
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
    protected readonly sDataView: Float64Array,
    /**
     * View on routes, same as {@link SharedRAPTORData.rDataView}
     */
    protected readonly rDataView: Float64Array,
    // Not readonly : a pointer is already often exposed, and moreover, permits access in O(1) without any overhead
    protected ptr: number,
    readonly ptrType: T,
  ) {
    // Runtime check
    if ((ptrType === PtrType.Stop && ptr >= sDataView.length) || (ptrType === PtrType.Route && ptr >= rDataView.length))
      throw new Error("Pointer out of range");
  }

  point(ptr: number) {
    this.ptr = ptr;

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  get chunkSize() {
    return 1;
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

  // to & length
  static _chunkSize = 2;
  public get chunkSize() {
    return FootPathRetriever._chunkSize;
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

  protected get connectedRoutesChunkSize() {
    return this.sDataView[this.ptr + 1];
  }

  get connectedRoutes() {
    return new ArrayView(
      () => this.connectedRoutesChunkSize,
      (idx) => this.sDataView[this.ptr + 1 + 1 + idx],
      (a, b) => a === b,
    );
  }

  protected get transfersChunkSize() {
    return this.sDataView[this.ptr + 1 + this.connectedRoutesChunkSize + 1];
  }

  get transfers() {
    return new ArrayView(
      // to & length
      () => this.transfersChunkSize / 2,
      (idx) =>
        new FootPathRetriever(
          this.sDataView,
          this.rDataView,
          this.ptr + 1 + this.connectedRoutesChunkSize + 1 + 1 + idx * FootPathRetriever._chunkSize,
          PtrType.Stop,
        ),
      (a, b) => FootPathRetriever.equals(a, b),
    );
  }

  get chunkSize() {
    return 1 + 1 + this.connectedRoutesChunkSize + 1 + this.transfersChunkSize;
  }
}

//
// Trip
//

interface SharedTrip {
  /**
   * Length 2 : `[arrival timestamp, departure timestamp]`.
   * Defined as `[number, number]` to match {@link Trip} interface, but is in fact a `Float64Array`
   */
  times: ArrayRead<[number, number]>;
}

class TripRetriever extends Retriever<PtrType.Route> implements Override<Trip<number>, SharedTrip> {
  get id() {
    return this.rDataView[this.ptr];
  }

  protected get timesChunkSize() {
    return this.rDataView[this.ptr + 1];
  }

  get times() {
    return new ArrayView(
      // 2 data cells per array element
      () => this.timesChunkSize / 2,
      (idx) => this.rDataView.subarray(this.ptr + 2 + idx * 2, this.ptr + 2 + (idx + 1) * 2) as unknown as [number, number],
      (a, b) =>
        (a as unknown as Float64Array).byteOffset === (b as unknown as Float64Array).byteOffset &&
        a.length === b.length &&
        (a as unknown as Float64Array).buffer === (b as unknown as Float64Array).buffer,
    );
  }

  get chunkSize() {
    return 1 + 1 + this.timesChunkSize;
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
  // Lazy compute & save value
  protected _tripsChunkSizes: number[] | null = null;

  get id() {
    return this.rDataView[this.ptr];
  }

  protected get ptrStopsChunkSize() {
    return this.ptr + 1;
  }

  get stops() {
    return new ArrayView(
      () => this.rDataView[this.ptrStopsChunkSize],
      (idx) => this.rDataView[this.ptr + 2 + idx],
      (a, b) => a === b,
    );
  }

  protected get ptrTripsChunkSize() {
    return this.ptr + 1 + this.rDataView[this.ptrStopsChunkSize] + 1;
  }

  get tripsChunkSizes(): number[] {
    const tripRetriever = new TripRetriever(this.sDataView, this.rDataView, 0, PtrType.Route);
    const chunkSizes = [];
    // Compute number of trips
    for (let ptr = this.ptrTripsChunkSize + 1; ptr < this.ptr + this.chunkSize; ptr += tripRetriever.chunkSize)
      chunkSizes.push(tripRetriever.point(ptr).chunkSize);

    return chunkSizes;
  }

  get trips() {
    return new ArrayView<Override<Trip<number>, SharedTrip>>(
      () => {
        if (this._tripsChunkSizes !== null) return this._tripsChunkSizes.length;

        return (this._tripsChunkSizes = this.tripsChunkSizes).length;
      },
      (idx) => {
        if (this._tripsChunkSizes === null) this._tripsChunkSizes = this.tripsChunkSizes;

        return new TripRetriever(
          this.sDataView,
          this.rDataView,
          this.ptrTripsChunkSize + 1 + this._tripsChunkSizes.reduce((acc, v, i) => (i < idx ? acc + v : acc), 0),
          PtrType.Route,
        );
      },
      (a, b) => a.id === b.id,
    );
  }

  departureTime(t: number, p: number): number {
    return this.trips.at(t)?.times.at(p)?.[1] ?? 0;
  }

  get chunkSize() {
    return 1 + 1 + this.rDataView[this.ptrStopsChunkSize] + 1 + this.rDataView[this.ptrTripsChunkSize];
  }
}

/**
 * Shared-memory enabled RAPTOR data
 */
export class SharedRAPTORData {
  // Max float64
  static readonly MAX_SAFE_TIMESTAMP: number = 3.4e38;
  readonly MAX_SAFE_TIMESTAMP: number = SharedRAPTORData.MAX_SAFE_TIMESTAMP;
  /**
   * Internal data (shared) buffer
   */
  protected data: SharedArrayBuffer;
  /**
   * View on stops
   */
  protected sDataView: Float64Array;
  /**
   * View on routes
   */
  protected rDataView: Float64Array;

  // Validate pointers
  secure = false;

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
    let stopsChunkSize: number | null = null;

    // Assign data storage
    this.data =
      "data" in stopsOrData
        ? stopsOrData.data
        : new SharedArrayBuffer(
            // Compute total data size (length for buffer), no grow needed
            // Size of stops buffer chunk
            (1 +
              (stopsChunkSize = stopsOrData.reduce<number>(
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
              )) +
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
              Float64Array.BYTES_PER_ELEMENT,
          );

    // Stops length in data buffer
    const stopsDataLengthChunk = new DataView(this.data, 0, Float64Array.BYTES_PER_ELEMENT);
    const getStopsChunkSize = () => stopsDataLengthChunk.getFloat64(0);
    const setStopsChunkSize = (length: number) => stopsDataLengthChunk.setFloat64(0, length);

    if (stopsChunkSize !== null) setStopsChunkSize(stopsChunkSize);

    if ("data" in stopsOrData) {
      // Just make views
      this.sDataView = new Float64Array(this.data, Float64Array.BYTES_PER_ELEMENT * 1, getStopsChunkSize());
      this.rDataView = new Float64Array(this.data, Float64Array.BYTES_PER_ELEMENT * (getStopsChunkSize() + 1));
    } else {
      //
      //Stops
      //

      this.sDataView = new Float64Array(this.data, Float64Array.BYTES_PER_ELEMENT * 1, getStopsChunkSize());
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
      }

      //
      // Routes
      //

      this.rDataView = new Float64Array(this.data, Float64Array.BYTES_PER_ELEMENT * (getStopsChunkSize() + 1));
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
          if (stopPtr !== undefined) this.rDataView[idx++] = stopPtr;
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

        this.rDataView[tripsChunkLengthIdx] = idx - tripsChunkLengthIdx - 1;
      }

      // Second iteration to resolve route pointers in stop connectedRoutes
      // First int is stop id -- ignore : start at 1 & add 1 at each iteration
      for (idx = 1; idx < this.sDataView.length; idx++) {
        // Second is length of connectedRoutes
        const connectedRoutesLength = this.sDataView[idx++];
        const startOfConnectedRoutes = idx;
        for (; idx < startOfConnectedRoutes + connectedRoutesLength; idx++) {
          // Get & set corresponding route pointer (index)
          const routePtr = rMapping.get(this.sDataView[idx]);
          if (routePtr !== undefined) this.sDataView[idx] = routePtr;
        }

        // Current idx is total length of transfers
        const transfersLength = this.sDataView[idx++];
        const startOfTransfers = idx;
        // Increment of 2 each time : to & length attr
        for (; idx < startOfTransfers + transfersLength; idx += 2) {
          // Get & set corresponding stop pointer (index)
          const stopPtr = sMapping.get(this.sDataView[idx]);
          if (stopPtr !== undefined) this.sDataView[idx] = stopPtr;
        }

        // Now current ptr (idx) is back to new stop id
      }

      // @ts-expect-error debug
      this.sMapping = sMapping;
      // @ts-expect-error debug
      this.rMapping = rMapping;
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

  /**
   * Convert a SI to a stop pointer
   * @param id
   */
  stopPointerFromId(id: number): number | undefined {
    const stopRetriever = new StopRetriever(this.sDataView, this.rDataView, 0, PtrType.Stop);
    for (let ptr = 0; ptr < this.sDataView.length; ptr += stopRetriever.chunkSize) if (stopRetriever.point(ptr).id === id) return ptr;

    return;
  }

  get stops(): MapRead<number, StopRetriever> {
    return {
      [Symbol.iterator]: function* (this: SharedRAPTORData) {
        const stopRetriever = new StopRetriever(this.sDataView, this.rDataView, 0, PtrType.Stop);
        for (let ptr = 0; ptr < this.sDataView.length; ptr += stopRetriever.point(ptr).chunkSize) {
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
      get: (ptr: number) => (
        this.secure && this.validatePointer(ptr, PtrType.Stop), new StopRetriever(this.sDataView, this.rDataView, ptr, PtrType.Stop)
      ),
    };
  }

  get routes(): MapRead<number, RouteRetriever> {
    return {
      [Symbol.iterator]: function* (this: SharedRAPTORData) {
        const routeRetriever = new RouteRetriever(this.sDataView, this.rDataView, 0, PtrType.Route);
        for (let ptr = 0; ptr < this.rDataView.length; ptr += routeRetriever.point(ptr).chunkSize) {
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
      get: (ptr: number) => (
        this.secure && this.validatePointer(ptr, PtrType.Route), new RouteRetriever(this.sDataView, this.rDataView, ptr, PtrType.Route)
      ),
    };
  }

  /**
   * Validate a stop or route pointer, in O(n)
   * @param ptr Pointer to validate
   * @param ptrType Pointer type
   * @returns True if pointer valid, throws otherwise
   */
  protected validatePointer(ptr: number, ptrType: PtrType): true {
    const retriever =
      ptrType === PtrType.Stop
        ? new StopRetriever(this.sDataView, this.rDataView, 0, PtrType.Stop)
        : new RouteRetriever(this.sDataView, this.rDataView, 0, PtrType.Route);

    for (let iterPtr = 0; iterPtr <= ptr; iterPtr += retriever.point(iterPtr).chunkSize) if (ptr === iterPtr) return true;

    throw new Error(`Invalid pointer ${ptr} of type ${ptrType}`);
  }
}
