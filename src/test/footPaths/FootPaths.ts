import { node, nodeOrNullNode, nullNode, WeightedGraph } from "./utils/Graph";
import { FibonacciHeap, INode } from "@tyriar/fibonacci-heap";

export type path<N extends node = node> = N[];

export interface DijkstraOptions {
  maxCumulWeight: number;
}

/**
 * @description Generate the shortest paths from source node `s` to every nodes in graph `G`.
 * @param G Source graph
 * @param s Source node
 * @returns First, the distances from source node to considered node. Secondly, an array that traces downwards the shortest path from considered node to source node.
 */
export function Dijkstra<N extends node, G extends WeightedGraph<N>>(G: G, [s]: [N]): [Map<N, number>, Map<N, N>];
/**
 * @description Generate the shortest paths from source node `s` to every nodes in graph `G`, considering options `O`.
 * @param G Source graph
 * @param s Source node
 * @param O Options for Dijkstra computing
 * @returns First, the distances from source node to considered node. Secondly, an array that traces downwards the shortest path from considered node to source node.
 */
export function Dijkstra<N extends node, G extends WeightedGraph<N>>(G: G, [s]: [N], O: DijkstraOptions): [Map<N, number>, Map<N, N>];
/**
 * @description Computes the shortest path from source node `s` to target node `t` on graph `G`.
 * @param G Source graph
 * @param s Source node
 * @param t Target node
 * @returns The shortest path from s to t.
 */
export function Dijkstra<N extends node, G extends WeightedGraph<N>>(G: G, [s, t]: [N, N]): path<N>;
/**
 * @description Computes the shortest path from source node `s` to target node `t` on graph `G`, considering options `O`.
 * @param G Source graph
 * @param s Source node
 * @param t Target node
 * @param O Options for Dijkstra computing
 * @returns The shortest path from s to t.
 */
export function Dijkstra<N extends node, G extends WeightedGraph<N>>(G: G, [s, t]: [N, N], O: DijkstraOptions): path<N>;
export function Dijkstra<N extends node, G extends WeightedGraph<N>>(
  G: G,
  [s, t]: [N, N] | [N],
  O?: DijkstraOptions,
): path<N> | [Map<N, number>, Map<N, nodeOrNullNode<N>>] {
  const dist = new Map<N, number>();
  const prev = new Map<N, nodeOrNullNode<N>>();
  const Q = new FibonacciHeap<number, N>();
  const QMapping = new Map<N, INode<number, N> | null>();

  dist.set(s, 0);
  QMapping.set(s, Q.insert(0, s));
  for (const e of G.nodesIterator) {
    prev.set(e, nullNode);
    if (e != s) dist.set(e, Infinity);
  }

  while (!Q.isEmpty()) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const min = Q.extractMinimum()!; // Can't be null otherwise Q is empty
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    QMapping.set(min.value!, null);

    if (t !== undefined && min.value === t) break;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const v of G.neighborsIterator(min.value!) ?? []) {
      /**@description New alternative distance found from min, from a + (a,b) instead of b */
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const alt = min.key + G.weight(min.value!, v);

      if (O && alt > O.maxCumulWeight) continue;

      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        prev.set(v, min.value!);
        const vINode = QMapping.get(v);
        if (vINode != null) Q.decreaseKey(vINode, alt);
        else QMapping.set(v, Q.insert(alt, v));
      }
    }
  }

  if (t !== undefined) {
    return tracePath(prev, t, s);
  } else return [dist, prev];
}

/**
 * @description Get the path from source to target.
 * @param prev The second return value of Dijkstra, specific to the source.
 * @param target
 * @param source
 */
export function tracePath<N extends node>(prev: Map<N, nodeOrNullNode<N>>, target: N, source?: N): path<N> {
  let path: path<N> = [];
  let e: nodeOrNullNode<N> = target;
  if (prev.get(e) !== nullNode || (source && e === source)) {
    // If source === target, just return [target] (== [source])

    while (e !== nullNode) {
      path = [e, ...path];
      e = prev.get(e) ?? nullNode;
    }
  }

  return path;
}
