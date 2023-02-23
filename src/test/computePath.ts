import { path, Dijkstra, tracePath, DijkstraOptions } from "../FootPaths";
import { node, WeightedGraph } from "../utils/Graph";
import type { id } from "./test";

import { parentPort } from "worker_threads";
import { benchmark } from "./utils/benchmark";
import { approachedStopName } from "./utils/ultils";

export interface initData {
  adj: Required<ConstructorParameters<typeof WeightedGraph>>[0];
  weights: Required<ConstructorParameters<typeof WeightedGraph>>[1];
  stops: id[];
  options?: DijkstraOptions;
}
export function initialCallback(data: initData) {
  footGraph = new WeightedGraph(data.adj, data.weights);
  stops = data.stops;
  options = data.options;
  if (parentPort) parentPort.postMessage(true);
}

if (parentPort)
  parentPort.on("message", async (data: initData | Parameters<typeof computePath>) => {
    if (data instanceof Array) {
      if (parentPort) parentPort.postMessage(await computePath(...data));
    } else {
      initialCallback(data);
    }
  });

let footGraph: WeightedGraph | undefined;
let stops: initData["stops"] | undefined;
let options: initData["options"] | undefined;

export async function computePath<Paths extends boolean>(stopId: node, returnPaths: Paths) {
  const sourcePaths: Map<node, Paths extends true ? [path, number] : number> = new Map();

  if (!footGraph || !stops) return sourcePaths;

  const [dist, prev] = options ? await Dijkstra(footGraph, [stopId], options) : await Dijkstra(footGraph, [stopId]);

  for (const stopId of stops) {
    const targetNode = approachedStopName(stopId);

    if (dist.get(targetNode) !== undefined && dist.get(targetNode)! < Infinity)
      sourcePaths.set(
        stopId,
        (returnPaths ? [tracePath(prev, targetNode), dist.get(targetNode)!] : dist.get(targetNode)!) as Paths extends true ? [path, number] : number,
      );
  }

  return sourcePaths;
}

export async function computePathBench<Paths extends boolean>(stopId: node, returnPaths: boolean) {
  const sourcePaths: Map<node, Paths extends true ? [path, number] : number> = new Map();

  if (!footGraph || !stops) return sourcePaths;

  const [dist, prev] = options
    ? (
        await benchmark(Dijkstra as (G: WeightedGraph, [s]: [node], O: DijkstraOptions) => [Map<node, number>, Map<node, node>], [
          footGraph,
          [stopId],
          options,
        ])
      ).lastReturn!
    : (await benchmark(Dijkstra as (G: WeightedGraph, [s]: [node]) => [Map<node, number>, Map<node, node>], [footGraph, [stopId]])).lastReturn!;

  await benchmark(
    (s: NonNullable<typeof stops>) => {
      for (const stopId of s) {
        const targetNode = approachedStopName(stopId);

        if (dist.get(targetNode) !== undefined && dist.get(targetNode)! < Infinity)
          sourcePaths.set(
            stopId,
            (returnPaths ? [tracePath(prev, targetNode), dist.get(targetNode)!] : dist.get(targetNode)!) as Paths extends true
              ? [path, number]
              : number,
          );
      }
    },
    [stops],
    1,
    true,
  );

  return sourcePaths;
}
