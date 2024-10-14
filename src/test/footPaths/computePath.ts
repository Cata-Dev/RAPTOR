import { path, Dijkstra, tracePath, DijkstraOptions } from "@catatomik/dijkstra";
import { unpackGraphNode, WeightedGraph } from "@catatomik/dijkstra/lib/utils/Graph";
import type { footGraphNodes, id } from "./test";

import { parentPort } from "worker_threads";
import { benchmark } from "../utils/benchmark";
import { approachedStopName } from "./utils/ultils";

export interface initData {
  adj: Required<ConstructorParameters<typeof WeightedGraph<footGraphNodes>>>[0];
  weights: Required<ConstructorParameters<typeof WeightedGraph<footGraphNodes>>>[1];
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
  parentPort.on("message", (data: initData | Parameters<typeof computePath>) => {
    if (data instanceof Array) {
      if (parentPort) parentPort.postMessage(computePath(...data));
    } else {
      initialCallback(data);
    }
  });

let footGraph: WeightedGraph<footGraphNodes> | undefined;
let stops: initData["stops"] | undefined;
let options: initData["options"] | undefined;

export function computePath(
  sourceStopId: ReturnType<typeof approachedStopName>,
  returnPaths: boolean,
  computedStops = new Set<initData["stops"][number]>(),
) {
  const sourcePaths = new Map<initData["stops"][number], [path<unpackGraphNode<typeof footGraph>>, number]>();

  if (!footGraph || !stops) return sourcePaths;

  const [dist, prev] = options
    ? Dijkstra<footGraphNodes, typeof footGraph>(footGraph, [sourceStopId], options)
    : Dijkstra<footGraphNodes, typeof footGraph>(footGraph, [sourceStopId]);

  for (const stopId of stops) {
    const targetNode = approachedStopName(stopId);

    if (dist.get(targetNode) !== undefined && dist.get(targetNode)! < Infinity && sourceStopId !== targetNode && !computedStops.has(stopId))
      sourcePaths.set(stopId, [returnPaths ? tracePath(prev, targetNode) : [], dist.get(targetNode)!]);
  }

  return sourcePaths;
}

export async function computePathBench(
  sourceStopId: ReturnType<typeof approachedStopName>,
  returnPaths: boolean,
  computedStops = new Set<initData["stops"][number]>(),
) {
  const sourcePaths = new Map<initData["stops"][number], [path<unpackGraphNode<typeof footGraph>>, number]>();

  if (!footGraph || !stops) return sourcePaths;

  const [dist, prev] = options
    ? (
        await benchmark(
          Dijkstra as (
            G: typeof footGraph,
            [s]: [typeof sourceStopId],
            O: DijkstraOptions,
          ) => [Map<footGraphNodes, number>, Map<footGraphNodes, footGraphNodes>],
          [footGraph, [sourceStopId], options],
        )
      ).lastReturn!
    : (
        await benchmark(
          Dijkstra as (G: typeof footGraph, [s]: [typeof sourceStopId]) => [Map<footGraphNodes, number>, Map<footGraphNodes, footGraphNodes>],
          [footGraph, [sourceStopId]],
        )
      ).lastReturn!;

  await benchmark(
    (s: NonNullable<typeof stops>) => {
      for (const stopId of s) {
        const targetNode = approachedStopName(stopId);

        if (dist.get(targetNode) !== undefined && dist.get(targetNode)! < Infinity && sourceStopId !== targetNode && !computedStops.has(stopId))
          sourcePaths.set(stopId, [returnPaths ? tracePath(prev, targetNode) : [], dist.get(targetNode)!]);
      }
    },
    [stops],
  );

  return sourcePaths;
}
