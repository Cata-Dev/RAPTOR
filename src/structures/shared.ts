import { ArrayRead, FootPath, IRAPTORData, MapRead, RAPTORData, Route, Stop, Trip } from "./base";
import { Time, TimeScal } from "./time";

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

class StopRetriever extends Retriever<PtrType.Stop, Stop<SharedID, SharedID>> implements Stop<SharedID, SharedID> {
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

  get transfers() {
    const originalLength = this.transfersChunkSize / 2;

    return new ArrayView(
      // to & length
      () => originalLength + (this.attachedData?.transfers.length ?? 0),
      (idx) =>
        idx < originalLength
          ? new FootPathRetriever(
              this.sDataView,
              this.rDataView,
              this.ptr + 1 + this.connectedRoutesChunkSize + 1 + 1 + idx * FootPathRetriever._chunkSize,
              PtrType.Stop,
            )
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.attachedData!.transfers.at(idx - originalLength)!,
      (a, b) =>
        a instanceof FootPathRetriever && b instanceof FootPathRetriever
          ? FootPathRetriever.equals(a, b)
          : // Can compare directly : they're references
            a === b,
    );
  }

  get chunkSize() {
    return 1 + 1 + this.connectedRoutesChunkSize + 1 + this.transfersChunkSize;
  }
}

//
// Trip
//

class TripRetriever<TimeVal> extends Retriever<PtrType.Route, void> implements Trip<TimeVal> {
  constructor(
    readonly timeType: SharedTime<TimeVal>,
    ...params: ConstructorParameters<typeof Retriever<PtrType.Route, void>>
  ) {
    super(...params);
  }

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
      (idx) =>
        [
          this.timeType.sharedDeserialize(
            this.rDataView.subarray(
              this.ptr + 2 + idx * 2 * this.timeType.sharedSerializedLen,
              this.ptr + 2 + idx * 2 * this.timeType.sharedSerializedLen + this.timeType.sharedSerializedLen,
            ),
          ),
          this.timeType.sharedDeserialize(
            this.rDataView.subarray(
              this.ptr + 2 + idx * 2 * this.timeType.sharedSerializedLen + this.timeType.sharedSerializedLen,
              this.ptr + 2 + (idx + 1) * 2 * this.timeType.sharedSerializedLen,
            ),
          ),
        ] satisfies [unknown, unknown],
      (a, b) => a === b,
    );
  }

  get chunkSize() {
    return 1 + 1 + this.timesChunkSize;
  }
}

//
// Route
//

class RouteRetriever<TimeVal>
  extends Retriever<PtrType.Route, Route<TimeVal, SharedID, SharedID, number>>
  implements Route<TimeVal, SharedID, SharedID, number>
{
  constructor(
    readonly timeType: SharedTime<TimeVal>,
    ...params: ConstructorParameters<typeof Retriever<PtrType.Route, Route<TimeVal, SharedID, SharedID, number>>>
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
      () => originalLength + (this.attachedData?.stops.length ?? 0),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (idx) => (idx < originalLength ? this.rDataView[this.ptr + 2 + idx] : this.attachedData!.stops.at(idx - originalLength)!),
      (a, b) =>
        // Comparing references
        a === b,
    );
  }

  protected get ptrTripsChunkSize() {
    return this.ptr + 1 + this.rDataView[this.ptrStopsChunkSize] + 1;
  }

  get tripsChunkSizes(): number[] {
    const tripRetriever = new TripRetriever(this.timeType, this.sDataView, this.rDataView, 0, PtrType.Route);
    const chunkSizes = [];
    // Compute number of trips
    for (let ptr = this.ptrTripsChunkSize + 1; ptr < this.ptr + this.chunkSize; ptr += tripRetriever.chunkSize)
      chunkSizes.push(tripRetriever.point(ptr).chunkSize);

    return chunkSizes;
  }

  get trips() {
    return new ArrayView<Trip<TimeVal, number>>(
      () => (this._tripsChunkSizes ??= this.tripsChunkSizes).length + (this.attachedData?.trips.length ?? 0),
      (idx) => {
        this._tripsChunkSizes ??= this.tripsChunkSizes;

        return idx < this._tripsChunkSizes.length
          ? new TripRetriever(
              this.timeType,
              this.sDataView,
              this.rDataView,
              this.ptrTripsChunkSize + 1 + this._tripsChunkSizes.reduce((acc, v, i) => (i < idx ? acc + v : acc), 0),
              PtrType.Route,
            )
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.attachedData!.trips.at(idx - this._tripsChunkSizes.length)!;
      },
      (a, b) => a.id === b.id,
    );
  }

  departureTime(t: number, p: number): TimeVal {
    return (Route.prototype as Route<TimeVal, SharedID, SharedID, number>).departureTime.apply(this, [t, p]);
  }

  get chunkSize() {
    return 1 + 1 + this.rDataView[this.ptrStopsChunkSize] + 1 + this.rDataView[this.ptrTripsChunkSize];
  }
}

/**
 * Memory-shared RAPTOR data
 */
class SharedRAPTORData<TimeVal> implements IRAPTORData<TimeVal, SharedID, SharedID, number> {
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

  protected attachedStops: MapRead<SharedID, Stop<SharedID, SharedID>> = new Map();
  protected attachedRoutes: MapRead<SharedID, Route<TimeVal, SharedID, SharedID, number>> = new Map();

  /**
   *
   * @param data Instantiate from {@link SharedRAPTORData.prototype.internalData} exported data
   */
  protected constructor(timeType: SharedTime<TimeVal>, data: typeof SharedRAPTORData.prototype.internalData);
  protected constructor(
    timeType: SharedTime<TimeVal>,
    stops: ConstructorParameters<typeof RAPTORData<TimeVal, number, number, number>>[1],
    routes: ConstructorParameters<typeof RAPTORData<TimeVal, number, number, number>>[2],
  );
  protected constructor(
    readonly timeType: SharedTime<TimeVal>,
    dataOrStops: typeof SharedRAPTORData.prototype.internalData | ConstructorParameters<typeof RAPTORData<TimeVal, number, number, number>>[1],
    routes?: ConstructorParameters<typeof RAPTORData<TimeVal, number, number, number>>[2],
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
                        // trip id
                        1 +
                        // length of trip times chunk
                        1 +
                        // trip times chunk
                        v.times.length * 2 * timeType.sharedSerializedLen,
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

      for (const stop of dataOrStops) {
        sMapping.set(stop.id, idx);
        this.sDataView[idx++] = stop.id;

        this.sDataView[idx++] = stop.connectedRoutes.length;
        // Store ID first, then convert to ptr
        for (const connectedRoute of stop.connectedRoutes) this.sDataView[idx++] = connectedRoute;

        // Total length of transfers chunk
        this.sDataView[idx++] = stop.transfers.length * 2;
        for (const transfer of Array.from(stop.transfers)
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
          this.rDataView[idx++] = trip.id;

          // Trip times length
          this.rDataView[idx++] = trip.times.length * 2 * timeType.sharedSerializedLen;
          for (const timePair of trip.times)
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
    stops: ConstructorParameters<typeof RAPTORData<TimeVal, number, number, number>>[1],
    routes: ConstructorParameters<typeof RAPTORData<TimeVal, number, number, number>>[2],
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
    if ((ptrType === PtrType.Stop ? this.attachedStops : this.attachedRoutes).get(id)) return id;

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
    } as MapRead<SharedID, Stop<SharedID, SharedID>>;
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
        const seen = new Set<SharedID>();

        const routeRetriever = new RouteRetriever(this.timeType, this.sDataView, this.rDataView, 0, PtrType.Route, null);
        for (let ptr = 0; ptr < this.rDataView.length; ptr += routeRetriever.point(ptr).chunkSize) {
          seen.add(ptr);

          /**
           * Pointer (index in buffer) to route, retrieve it through `get` method.
           */
          yield [
            ptr,
            new RouteRetriever(this.timeType, this.sDataView, this.rDataView, ptr, PtrType.Route, this.attachedRoutes.get(ptr) ?? null),
          ] satisfies [unknown, unknown];
        }

        for (const [k, v] of this.attachedRoutes) {
          if (seen.has(k)) continue;

          yield [k, v] satisfies [unknown, unknown];
          // No need to add to `seen` : considering no duplication inside `attachedRoutes`
        }

        return undefined;
      }.bind(this),
      /**
       * Maps a route pointer to its corresponding {@link RouteRetriever}
       * @param ptr Pointer to a route
       */
      get: (ptr: SharedID) => {
        if (this.secure && typeof ptr === "number") this.validatePointer(ptr, PtrType.Route);

        const attached = this.attachedRoutes.get(ptr);
        // Means this route would not have been present in original data, no need to merge it
        if (typeof ptr === "string") return attached;

        return new RouteRetriever(this.timeType, this.sDataView, this.rDataView, ptr, PtrType.Route, attached ?? null);
      },
    } as MapRead<SharedID, Route<TimeVal, SharedID, SharedID, number>>;
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

  attachData(stops: ArrayRead<Stop<number, number>>, routes: ArrayRead<ConstructorParameters<typeof Route<TimeVal, number, number, number>>>) {
    // Need to resolve pointers when possible
    this.attachedStops = new Map(
      stops.map((s) => {
        const id = this.stopPointerFromId(s.id) ?? SharedRAPTORData.serializeId(s.id);

        return [
          id,
          {
            id,
            connectedRoutes: s.connectedRoutes.map((r) => this.routePointerFromId(r) ?? r),
            transfers: s.transfers.map(({ length, to }) => ({
              length,
              to: this.stopPointerFromId(to) ?? SharedRAPTORData.serializeId(to),
            })),
          },
        ] as const;
      }),
    );

    this.attachedRoutes = new Map(
      routes.map(([rId, stopsIds, trips]) => {
        const id = this.routePointerFromId(rId) ?? SharedRAPTORData.serializeId(rId);

        return [
          id,
          new Route(
            id,
            stopsIds.map((sId) => this.stopPointerFromId(sId) ?? SharedRAPTORData.serializeId(sId)),
            trips,
          ),
        ] as const;
      }),
    );
  }
}

export { ArrayView, SerializedId, SharedID, SharedRAPTORData, sharedTimeScal };
