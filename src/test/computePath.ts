import { path, Dijkstra, tracePath } from '../FootPaths';
import { WeightedGraph } from '../utils/Graph';
import { id } from './test';

let footGraph: WeightedGraph | undefined;
let stops: dbSNCF_Stops[] | undefined;

export function computePath(i: number) {

    const sourcePaths: Map<id, [path, number]> = new Map();

    if (!footGraph || !stops) return sourcePaths;

    const [dist, prev] = Dijkstra(footGraph, `stop-${stops[i]._id}`);

    for (let j = 0; j < stops.length; j++) {

        // const targetStop: stop = stops[j]; //Better assigning those 2 vars or getting stops[j] 3 times + casting to string 2 times ?
        // const targetNode = `stop-${targetStop._id}`;

        sourcePaths.set(stops[j]._id, [tracePath(prev, `stop-${stops[j]._id}`), dist.get(`stop-${stops[j]._id}`) || Infinity]); // ` || Infinity` Added for ts mental health

    }

    return sourcePaths;
}

import { parentPort } from 'worker_threads';
import { dbSNCF_Stops } from './models/SNCF_stops.model';

if (parentPort) parentPort.on('message', (data) => {

    if (data.init === true) {
        footGraph = new WeightedGraph(data.adj, data.weights);
        stops = data.stops;
        if (parentPort) parentPort.postMessage(true);
    } else {
        if (parentPort) parentPort.postMessage(computePath(data));
    }

})