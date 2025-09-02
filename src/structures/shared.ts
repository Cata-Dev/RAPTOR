import { ArrayRead, FootPath, IRAPTORData, IStop, MapRead, RAPTORData, Route, Stop, Trip } from "./base";
import { Time, TimeInt, TimeScal } from "./time";

//
// Time
//

type SharedTime<T> = Time<T> & {
  sharedSerializedLen: number;
  sharedSerialize: (time: T) => Float64Array;
  sharedDeserialize: (data: Float64Array) => T;
};

const sharedTimeScal: SharedTime<number> = {
  ...TimeScal,

  sharedSerializedLen: 1,
  sharedSerialize: (time) => new Float64Array([time]),
  sharedDeserialize: (data) => data[0],
};

const sharedTimeIntOrderLow: SharedTime<readonly [number, number]> = {
  ...TimeInt,

  sharedSerializedLen: 2,
  sharedSerialize: ([low, high]) => new Float64Array([low, high]),
  sharedDeserialize: (data) => [data[0], data[1]],
};

type SharedID = number | SerializedId;

/**
 * Helper type for viewing-only arrays, with some viewing methods of {@link Array}.
 */
class ArrayView<T> implements ArrayRead<T> {
  protected _length: number | null = null;

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
    let acc = initialValue;
    for (let idx = 0; idx < this.length; idx++) acc = callbackfn(acc, this._at(idx), idx, this);
    return acc;
  }
}

enum PtrType {
  Stop,
  Route,
}

/**
 * A DataView built on top of {@link SharedRAPTORData} internals to ease & enhance data manipulation
 */
class Retriever<T extends PtrType, A> {
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
    readonly attachedData: A | null,
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

class FootPathRetriever extends Retriever<PtrType.Stop, void> implements FootPath<number> {
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

type SerializedId = ReturnType<(typeof SharedRAPTORData)["serializeId"]>;

//
// Stop
//

class StopRetriever extends Retriever<PtrType.Stop, IStop<SharedID, number>> implements IStop<SharedID, number> {
  get id() {
    return this.sDataView[this.ptr];
  }

  /**
   * Is also equal to length
   */
  protected get connectedRoutesChunkSize() {
    return this.sDataView[this.ptr + 1];
  }

  get connectedRoutes() {
    return new ArrayView(
      () => this.connectedRoutesChunkSize + (this.attachedData?.connectedRoutes.length ?? 0),
      (idx) =>
        idx < this.connectedRoutesChunkSize
          ? this.sDataView[this.ptr + 1 + 1 + idx]
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.attachedData!.connectedRoutes.at(idx - this.connectedRoutesChunkSize)!,
      (a, b) => a === b,
    );
  }

  protected get transfersChunkSize() {
    return this.sDataView[this.ptr + 1 + this.connectedRoutesChunkSize + 1];
  }

  *transfers(maxLength: number) {
    for (let i = 0; i < this.transfersChunkSize / 2; ++i) {
      const fp = new FootPathRetriever(
        this.sDataView,
        this.rDataView,
        this.ptr + 1 + this.connectedRoutesChunkSize + 1 + 1 + i * FootPathRetriever._chunkSize,
        PtrType.Stop,
      );

      if (fp.length > maxLength) break;

      yield fp;
    }

    if (this.attachedData) for (const transfer of this.attachedData.transfers(maxLength)) yield transfer;
  }

  get chunkSize() {
    return 1 + 1 + this.connectedRoutesChunkSize + 1 + this.transfersChunkSize;
  }
}

//
// Route
//

class RouteRetriever<TimeVal> extends Retriever<PtrType.Route, void> implements Route<TimeVal, SharedID, number> {
  constructor(
    readonly timeType: SharedTime<TimeVal>,
    ...params: ConstructorParameters<typeof Retriever<PtrType.Route, void>>
  ) {
    super(...params);
  }

  // Lazy compute & save value
  protected _tripsChunkSizes: number[] | null = null;

  get id() {
    return this.rDataView[this.ptr];
  }

  protected get ptrStopsChunkSize() {
    return this.ptr + 1;
  }

  get stops() {
    const originalLength = this.rDataView[this.ptrStopsChunkSize];

    return new ArrayView(
      () => originalLength,
      (idx) => this.rDataView[this.ptr + 2 + idx],
      (a, b) =>
        // Comparing references
        a === b,
    );
  }

  protected get ptrTripsChunkSize() {
    return this.ptr + 1 + this.rDataView[this.ptrStopsChunkSize] + 1;
  }

  get tripsChunkSizes(): number[] {
    const chunkSizes = [];
    for (let ptr = this.ptrTripsChunkSize + 1; ptr < this.ptr + this.chunkSize; ptr += 1 + this.rDataView[ptr])
      chunkSizes.push(
        // ptr of times chunk size + times chunk size
        1 + this.rDataView[ptr],
      );

    return chunkSizes;
  }

  get trips() {
    return new ArrayView<Trip<TimeVal>>(
      () => (this._tripsChunkSizes ??= this.tripsChunkSizes).length,
      (idx) => {
        this._tripsChunkSizes ??= this.tripsChunkSizes;
        const tripTimesPtr = this.ptrTripsChunkSize + 1 + this._tripsChunkSizes.reduce((acc, v, i) => (i < idx ? acc + v : acc), 0);

        return new ArrayView(
          () => this.rDataView[tripTimesPtr] / 2,
          (idx) =>
            [
              this.timeType.sharedDeserialize(
                this.rDataView.subarray(
                  tripTimesPtr + 1 + idx * 2 * this.timeType.sharedSerializedLen,
                  tripTimesPtr + 1 + idx * 2 * this.timeType.sharedSerializedLen + this.timeType.sharedSerializedLen,
                ),
              ),
              this.timeType.sharedDeserialize(
                this.rDataView.subarray(
                  tripTimesPtr + 1 + idx * 2 * this.timeType.sharedSerializedLen + this.timeType.sharedSerializedLen,
                  tripTimesPtr + 1 + (idx + 1) * 2 * this.timeType.sharedSerializedLen,
                ),
              ),
            ] satisfies [unknown, unknown],
          (a, b) => a === b,
        );
      },
      (a, b) => a === b,
    );
  }

  departureTime(t: number, p: number): TimeVal {
    return (Route.prototype as Route<TimeVal, SharedID, number>).departureTime.apply(this, [t, p]);
  }

  get chunkSize() {
    return 1 + 1 + this.rDataView[this.ptrStopsChunkSize] + 1 + this.rDataView[this.ptrTripsChunkSize];
  }
}

/**
 * Memory-shared RAPTOR data
 */
class SharedRAPTORData<TimeVal> implements IRAPTORData<TimeVal, SharedID, number> {
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

  protected attachedStops = new Map<SharedID, IStop<SharedID, number>>();

  /**
   *
   * @param data Instantiate from {@link SharedRAPTORData.prototype.internalData} exported data
   */
  protected constructor(timeType: SharedTime<TimeVal>, data: typeof SharedRAPTORData.prototype.internalData);
  protected constructor(
    timeType: SharedTime<TimeVal>,
    stops: ConstructorParameters<typeof RAPTORData<TimeVal, number, number>>[1],
    routes: ConstructorParameters<typeof RAPTORData<TimeVal, number, number>>[2],
  );
  protected constructor(
    readonly timeType: SharedTime<TimeVal>,
    dataOrStops: typeof SharedRAPTORData.prototype.internalData | ConstructorParameters<typeof RAPTORData<TimeVal, number, number>>[1],
    routes?: ConstructorParameters<typeof RAPTORData<TimeVal, number, number>>[2],
  ) {
    let stopsChunkSize: number | null = null;

    // Assign data storage
    this.data =
      "data" in dataOrStops
        ? dataOrStops.data
        : new SharedArrayBuffer(
            // Compute total data size (length for buffer), no grow needed
            // Size of stops buffer chunk
            (1 +
              (stopsChunkSize = dataOrStops.reduce<number>(
                (acc, [_, connectedRoutes, transfers]) =>
                  acc +
                  // stop id
                  1 +
                  // length of connected routes chunk
                  (1 +
                    // connected routes chunk
                    connectedRoutes.length) +
                  // length of transfers chunk
                  (1 +
                    // transfers chunk
                    transfers.length * 2),
                0,
              )) +
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
                        // length of trip times chunk
                        1 +
                        // trip times chunk
                        v.length * 2 * timeType.sharedSerializedLen,
                      0,
                    )),
                0,
              )) *
              Float64Array.BYTES_PER_ELEMENT,
          );

    // Stops length in data buffer
    const stopsDataLengthChunk = new DataView(this.data, 0, Float64Array.BYTES_PER_ELEMENT);
    const getStopsChunkSize = () => stopsDataLengthChunk.getFloat64(0);
    const setStopsChunkSize = (length: number) => {
      stopsDataLengthChunk.setFloat64(0, length);
    };

    if (stopsChunkSize !== null) setStopsChunkSize(stopsChunkSize);

    if ("data" in dataOrStops) {
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

      for (const [id, connectedRoutes, transfers] of dataOrStops) {
        sMapping.set(id, idx);
        this.sDataView[idx++] = id;

        this.sDataView[idx++] = connectedRoutes.length;
        // Store ID first, then convert to ptr
        for (const connectedRoute of connectedRoutes) this.sDataView[idx++] = connectedRoute;

        // Total length of transfers chunk
        this.sDataView[idx++] = transfers.length * 2;
        for (const transfer of Array.from(transfers)
          // Sort in order to iterate in transfer length ascending order
          .sort((a, b) => a.length - b.length)) {
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
          // Trip times length
          this.rDataView[idx++] = trip.length * 2 * timeType.sharedSerializedLen;
          for (const timePair of trip)
            for (const time of timePair) {
              this.rDataView.set(timeType.sharedSerialize(time), idx);
              idx += timeType.sharedSerializedLen;
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
    }
  }

  get internalData() {
    return {
      // Only need for the moment
      data: this.data,
    };
  }

  static makeFromRawData<TimeVal>(
    timeType: SharedTime<TimeVal>,
    stops: ConstructorParameters<typeof RAPTORData<TimeVal, number, number>>[1],
    routes: ConstructorParameters<typeof RAPTORData<TimeVal, number, number>>[2],
  ) {
    return new SharedRAPTORData(timeType, stops, routes);
  }

  static makeFromInternalData<TimeVal>(timeType: SharedTime<TimeVal>, data: typeof SharedRAPTORData.prototype.internalData) {
    return new SharedRAPTORData(timeType, data);
  }

  /**
   * Serialize into primitive type, but different as pointer type (number)
   */
  static serializeId(id: number) {
    return `id-${id}` as const;
  }

  static deserializeId(serializeId: SerializedId) {
    return parseInt(serializeId.substring(3));
  }

  protected pointerFromId(id: number, ptrType: PtrType): number | undefined {
    if (ptrType === PtrType.Stop && this.attachedStops.get(id)) return id;

    const retriever =
      ptrType === PtrType.Stop
        ? new StopRetriever(this.sDataView, this.rDataView, 0, PtrType.Stop, null)
        : new RouteRetriever(this.timeType, this.sDataView, this.rDataView, 0, PtrType.Route, null);
    for (let ptr = 0; ptr < this.sDataView.length; ptr += retriever.chunkSize) if (retriever.point(ptr).id === id) return ptr;

    return;
  }

  /**
   * Convert a SI to a stop pointer
   * @param id
   */
  stopPointerFromId(id: number): number | undefined {
    return this.pointerFromId(id, PtrType.Stop);
  }

  get stops() {
    return {
      [Symbol.iterator]: function* (this: SharedRAPTORData<TimeVal>) {
        if (this.sDataView.length === 0) return undefined;

        const seen = new Set<SharedID>();

        const stopRetriever = new StopRetriever(this.sDataView, this.rDataView, 0, PtrType.Stop, null);
        for (let ptr = 0; ptr < this.sDataView.length; ptr += stopRetriever.point(ptr).chunkSize) {
          seen.add(ptr);

          /**
           * Pointer (index in buffer) to stop, retrieve it through `get` method.
           */
          yield [ptr, new StopRetriever(this.sDataView, this.rDataView, ptr, PtrType.Stop, this.attachedStops.get(ptr) ?? null)] satisfies [
            unknown,
            unknown,
          ];
        }

        for (const [k, v] of this.attachedStops) {
          if (seen.has(k)) continue;

          yield [k, v] satisfies [unknown, unknown];
          // No need to add to `seen` : considering no duplication inside `attachedStops`
        }

        return undefined;
      }.bind(this),
      /**
       * Maps a stop pointer to its corresponding {@link StopRetriever}
       * @param ptr Pointer to a stop
       */
      get: (ptr: SharedID) => {
        if (this.secure && typeof ptr === "number") this.validatePointer(ptr, PtrType.Stop);

        const attached = this.attachedStops.get(ptr);
        // Means this stop would not have been present in original data, no need to merge it
        if (typeof ptr === "string") return attached;

        return new StopRetriever(this.sDataView, this.rDataView, ptr, PtrType.Stop, attached ?? null);
      },
    } as MapRead<SharedID, Stop<SharedID, number>>;
  }

  /**
   * Convert a RI to a route pointer
   * @param id
   */
  routePointerFromId(id: number): number | undefined {
    return this.pointerFromId(id, PtrType.Route);
  }

  get routes() {
    return {
      [Symbol.iterator]: function* (this: SharedRAPTORData<TimeVal>) {
        if (this.rDataView.length === 0) return undefined;

        const routeRetriever = new RouteRetriever(this.timeType, this.sDataView, this.rDataView, 0, PtrType.Route, null);
        for (let ptr = 0; ptr < this.rDataView.length; ptr += routeRetriever.point(ptr).chunkSize) {
          /**
           * Pointer (index in buffer) to route, retrieve it through `get` method.
           */
          yield [ptr, new RouteRetriever(this.timeType, this.sDataView, this.rDataView, ptr, PtrType.Route)] satisfies [unknown, unknown];
        }

        return undefined;
      }.bind(this),
      /**
       * Maps a route pointer to its corresponding {@link RouteRetriever}
       * @param ptr Pointer to a route
       */
      get: (ptr: number) => {
        if (this.secure && typeof ptr === "number") this.validatePointer(ptr, PtrType.Route);

        return new RouteRetriever(this.timeType, this.sDataView, this.rDataView, ptr, PtrType.Route);
      },
    } as MapRead<number, Route<TimeVal, SharedID, number>>;
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
        ? new StopRetriever(this.sDataView, this.rDataView, 0, PtrType.Stop, null)
        : new RouteRetriever(this.timeType, this.sDataView, this.rDataView, 0, PtrType.Route, null);

    for (let iterPtr = 0; iterPtr <= ptr; iterPtr += retriever.point(iterPtr).chunkSize) if (ptr === iterPtr) return true;

    throw new Error(`Invalid pointer ${ptr} of type ${ptrType}`);
  }

  attachStops(stops: ConstructorParameters<typeof Stop<number, number>>[]) {
    // Need to resolve pointers when possible
    this.attachedStops = new Map(
      stops.map(([sId, connectedRoutes, transfers]) => {
        const ptrOrId = this.stopPointerFromId(sId) ?? SharedRAPTORData.serializeId(sId);

        return [
          ptrOrId,
          new Stop(
            ptrOrId,
            connectedRoutes.map((rId) => {
              const rPtr = this.routePointerFromId(rId);
              if (!rPtr) throw new Error(`Invalid attached stop connected route ID: ${rId}`);

              return rPtr;
            }),
            transfers.map(({ length, to: sId }) => ({
              length,
              to: this.stopPointerFromId(sId) ?? SharedRAPTORData.serializeId(sId),
            })),
          ),
        ] as const;
      }),
    );
  }
}

export { ArrayView, SharedRAPTORData, sharedTimeIntOrderLow, sharedTimeScal };
export type { SerializedId, SharedID };
