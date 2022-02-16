//A timestamp representation of a Date ; in milliseconds.
export type timestamp = number;

/**
 * @description A Trip, i.e. a succession of stop times.
 */
export class Trip {

    readonly stopTimes: timestamp[];
    readonly stopDurations: number[];
    
    /**
     * @param stopTimes Time of arrival at each stop.
     * @param stopDurations Duration before departure, in milliseconds.
     */
    constructor(stopTimes: timestamp[], stopDurations: number[]) {

        this.stopTimes = stopTimes;
        this.stopDurations = stopDurations;

    }

}

export type footPaths = Map<stopId, Array<{ to: stopId, length: number }>>

export type stopId = number;

/**
 * @description A Stop, i.e. a geographical specific point that is connected to a route.
 */
export class Stop {

    readonly lat: number;
    readonly long: number;
    readonly connectedRoutes: Array<routeId>;
    readonly transfers: footPaths;
    readonly id: any;

    /**
     * @description Creates a new Stop.
     */
    constructor(lat: number, long: number, connections: Array<routeId>, footPaths: footPaths, id: any) {

        this.lat = lat;
        this.long = long;
        this.connectedRoutes = connections;
        this.transfers = footPaths;
        this.id = id;

    }

}

export type routeId = number;

/**
 * @description A Route, i.e. a succession of geographical specific points (stops) alongside with their correspondings operated trips.
 */
export class Route {

     readonly stops: Array<stopId>;
     readonly trips: Array<Trip>;

    /**
     * @description Creates a new Route. Note that stops and trips are linked : they are cross-connected.
     */
    constructor(stops: Array<stopId>, trips: Array<Trip>) {

        this.stops = stops;
        this.trips = trips;

    }

    /**
     * @description Computes the departure time on a trip at stop p.
     * @param t Trip index in route.
     * @param p Stop index in route (trip).
     */
    departureTime(t: number, p: stopId): timestamp {
        
        const trip: Trip = this.trips[t];
        const pRouteIndex = this.stops[p];

        return trip.stopTimes[pRouteIndex]+trip.stopDurations[pRouteIndex];

    }

}