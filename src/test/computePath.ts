import { path, Dijkstra, tracePath } from '../FootPaths';
import { WeightedGraph } from '../utils/Graph';
import { stop, id } from './test';

let footGraph: WeightedGraph | undefined;
let stops: stop[] | undefined;

export function computePath(i: number) {

    const sourcePaths: Map<id, [path, number]> = new Map();
    const [dist, prev] = Dijkstra(footGraph, `stop-${stops[i]._id}`);

    for (let j = 0; j < stops.length; j++) {

        // const targetStop: stop = stops[j]; //Better assigning those 2 vars or getting stops[j] 3 times + casting to string 2 times ?
        // const targetNode = `stop-${targetStop._id}`;

        sourcePaths.set(stops[j]._id, [tracePath(prev, `stop-${stops[j]._id}`), dist.get(`stop-${stops[j]._id}`)]);

    }

    return sourcePaths;
}

import { parentPort } from 'worker_threads';

parentPort.on('message', (data) => {

    if (data.init === true) {
        footGraph = new WeightedGraph(data.adj, data.weights);
        stops = data.stops;
        parentPort.postMessage(true);
    } else {
        parentPort.postMessage(computePath(data));
    }

})