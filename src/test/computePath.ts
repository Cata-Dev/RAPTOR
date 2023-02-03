import { path, Dijkstra, tracePath, DijkstraOptions } from '../FootPaths';
import { node, WeightedGraph } from '../utils/Graph';
import { id, Section, Stop } from './test';

import { parentPort } from 'worker_threads';
import { benchmark } from './utils/benchmark';

export interface initData {
    adj: Required<ConstructorParameters<typeof WeightedGraph>>[0];
    weights: Required<ConstructorParameters<typeof WeightedGraph>>[1];
    stops: Array<Section | Stop>
    options?: DijkstraOptions;
}
export function initialCallback(data: initData) {
    footGraph = new WeightedGraph(data.adj, data.weights);
    stops = data.stops;
    options = data.options;
    if (parentPort) parentPort.postMessage(true);
}

if (parentPort) parentPort.on('message', async (data: initData | Parameters<typeof computePath>) => {
    if (data instanceof Array) {
        if (parentPort) parentPort.postMessage(await computePath(...data));
    } else {
        initialCallback(data)
    }

})

let footGraph: WeightedGraph | undefined;
let stops: initData["stops"] | undefined;
let options: initData["options"] | undefined;

export async function computePath(stopId: string) {

    const sourcePaths: Map<id, [path, number]> = new Map();

    if (!footGraph || !stops) return sourcePaths;

    const [dist, prev] = options ? await Dijkstra(footGraph, [stopId], options) : await Dijkstra(footGraph, [stopId]);

    for (let j = 0; j < stops.length; j++) {

        const targetNode = `stop-${stops[j]._id}`;

        if (dist.get(targetNode) !== undefined && dist.get(targetNode)! < Infinity)
            sourcePaths.set(stops[j]._id, [tracePath(prev, targetNode), dist.get(targetNode)!]);

    }

    return sourcePaths;
}

export async function computePathBench(stopId: string) {

    const sourcePaths: Map<id, [path, number]> = new Map();

    if (!footGraph || !stops) return sourcePaths;

    const [dist, prev] = options
        ? (await benchmark(Dijkstra as (G: WeightedGraph, [s]: [node], O: DijkstraOptions) => Promise<[Map<node, number>, Map<node, node>]>, [footGraph, [stopId], options])).lastReturn!
        : (await benchmark(Dijkstra as (G: WeightedGraph, [s]: [node]) => Promise<[Map<node, number>, Map<node, node>]>, [footGraph, [stopId]])).lastReturn!;

    await benchmark((s: NonNullable<typeof stops>) => {
        for (let j = 0; j < s.length; j++) {

            const targetNode = `stop-${s[j]._id}`;

            if (dist.get(targetNode) !== undefined && dist.get(targetNode)! < Infinity)
                sourcePaths.set(s[j]._id, [tracePath(prev, targetNode), dist.get(targetNode)!]);

        }
    }, [stops], 1, true)

    return sourcePaths;
}