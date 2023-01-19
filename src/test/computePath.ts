import { path, Dijkstra, tracePath } from '../FootPaths';
import { WeightedGraph } from '../utils/Graph';
import { id } from './test';

import { parentPort } from 'worker_threads';
import { dbSNCF_Stops } from './models/SNCF_stops.model';
import { dbTBM_Stops } from './models/TBM_stops.model';

export interface initData {
    adj: Required<ConstructorParameters<typeof WeightedGraph>>[0];
    weights: Required<ConstructorParameters<typeof WeightedGraph>>[1];
    stops: Array<dbTBM_Stops | dbSNCF_Stops>
}
export function initialCallback(data: initData) {
    footGraph = new WeightedGraph(data.adj, data.weights);
    stops = data.stops;
    if (parentPort) parentPort.postMessage(true);
}

if (parentPort) parentPort.on('message', (data: initData | Parameters<typeof computePath>) => {
    if (data instanceof Array) {
        if (parentPort) parentPort.postMessage(computePath(...data));
    } else {
        initialCallback(data)
    }

})

let footGraph: WeightedGraph | undefined;
let stops: initData["stops"] | undefined;

export function computePath(stopId: string) {

    const sourcePaths: Map<id, [path, number]> = new Map();

    if (!footGraph || !stops) return sourcePaths;

    const [dist, prev] = Dijkstra(footGraph, [stopId]);

    for (let j = 0; j < stops.length; j++) {

        // const targetStop: stop = stops[j]; //Better assigning those 2 vars or getting stops[j] 3 times + casting to string 2 times ?
        // const targetNode = `stop-${targetStop._id}`;

        sourcePaths.set(stops[j]._id, [tracePath(prev, `stop-${stops[j]._id}`), dist.get(`stop-${stops[j]._id}`) || Infinity]); // ` || Infinity` Added for ts mental health

    }

    return sourcePaths;
}