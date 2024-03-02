/**
 * A timestamp representation of a Date ; in milliseconds.
 */
export type timestamp = number;
export type Id = number | string;

export const MAX_SAFE_TIMESTAMP = 8_640_000_000_000_000;

/**
 * @description A Trip, i.e. a succession of stop times.
 */
export interface Trip {
  id: Id;
  /**
   * @param stopTimes Time of arrival & departure at each stop.
   */
  times: [timestamp, timestamp][];
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
  readonly lat: number;
  readonly long: number;
  readonly connectedRoutes: RI[];
  readonly transfers: FootPath<SI>[];
}

/**
 * @description A Route, i.e. a succession of geographical specific points (stops) alongside with their correspondings operated trips.
 */
export class Route<SI extends Id, RI extends Id> {
  /**
   * @description Creates a new Route. Note that stops and trips are linked : they are cross-connected.
   */
  constructor(
    readonly id: RI,
    readonly stops: SI[],
    readonly trips: Trip[],
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
