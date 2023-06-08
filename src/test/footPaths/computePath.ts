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
  parentPort.on("message", async (data: initData | Parameters<typeof computePath>) => {
    if (data instanceof Array) {
      if (parentPort) parentPort.postMessage(await computePath(...data));
    } else {
      initialCallback(data);
    }
  });

let footGraph: WeightedGraph<footGraphNodes> | undefined;
let stops: initData["stops"] | undefined;
let options: initData["options"] | undefined;

export async function computePath(
  sourceStopId: ReturnType<typeof approachedStopName>,
  returnPaths: boolean,
  computedStops: Set<initData["stops"][number]> = new Set(),
) {
  const sourcePaths: Map<initData["stops"][number], [path<unpackGraphNode<typeof footGraph>>, number]> = new Map();

  if (!footGraph || !stops) return sourcePaths;

  const [dist, prev] = options
    ? await Dijkstra<footGraphNodes, typeof footGraph>(footGraph, [sourceStopId], options)
    : await Dijkstra<footGraphNodes, typeof footGraph>(footGraph, [sourceStopId]);

  for (const stopId of stops) {
    const targetNode = approachedStopName(stopId);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (dist.get(targetNode) !== undefined && dist.get(targetNode)! < Infinity && sourceStopId !== targetNode && !computedStops.has(stopId))
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      sourcePaths.set(stopId, [returnPaths ? tracePath(prev, targetNode) : [], dist.get(targetNode)!]);
  }

  return sourcePaths;
}

export async function computePathBench(
  sourceStopId: ReturnType<typeof approachedStopName>,
  returnPaths: boolean,
  computedStops: Set<initData["stops"][number]> = new Set(),
) {
  const sourcePaths: Map<initData["stops"][number], [path<unpackGraphNode<typeof footGraph>>, number]> = new Map();

  if (!footGraph || !stops) return sourcePaths;

  const [dist, prev] = options
    ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (
        await benchmark(
          Dijkstra as (
            G: typeof footGraph,
            [s]: [typeof sourceStopId],
            O: DijkstraOptions,
          ) => [Map<footGraphNodes, number>, Map<footGraphNodes, footGraphNodes>],
          [footGraph, [sourceStopId], options],
        )
      ).lastReturn!
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (
        await benchmark(
          Dijkstra as (G: typeof footGraph, [s]: [typeof sourceStopId]) => [Map<footGraphNodes, number>, Map<footGraphNodes, footGraphNodes>],
          [footGraph, [sourceStopId]],
        )
      ).lastReturn!;

  await benchmark(
    (s: NonNullable<typeof stops>) => {
      for (const stopId of s) {
        const targetNode = approachedStopName(stopId);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (dist.get(targetNode) !== undefined && dist.get(targetNode)! < Infinity && sourceStopId !== targetNode && !computedStops.has(stopId))
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          sourcePaths.set(stopId, [returnPaths ? tracePath(prev, targetNode) : [], dist.get(targetNode)!]);
      }
    },
    [stops],
  );

  return sourcePaths;
}
