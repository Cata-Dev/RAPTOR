import { node, nodeOrNullNode, nullNode, WeightedGraph } from './utils/Graph';
import { FibonacciHeap, INode } from '@tyriar/fibonacci-heap';

export type path = node[];

export interface DijkstraOptions {
    maxCumulWeight: number;
}

/**
 * @description Generate the shortest paths from source node `s` to every nodes in graph `G`.
 * @param G Source graph
 * @param s Source node
 * @returns First, the distances from source node to considered node. Secondly, an array that traces downwards the shortest path from considered node to source node.
 */
export function Dijkstra(G: WeightedGraph, [s]: [node]): [Map<node, number>, Map<node, node>];
/**
 * @description Generate the shortest paths from source node `s` to every nodes in graph `G`, considering options `O`.
 * @param G Source graph
 * @param s Source node
 * @param O Options for Dijkstra computing
 * @returns First, the distances from source node to considered node. Secondly, an array that traces downwards the shortest path from considered node to source node.
 */
export function Dijkstra(G: WeightedGraph, [s]: [node], O: DijkstraOptions): [Map<node, number>, Map<node, node>];
/**
 * @description Computes the shortest path from source node `s` to target node `t` on graph `G`.
 * @param G Source graph
 * @param s Source node
 * @param t Target node
 * @returns The shortest path from s to t.
 */
export function Dijkstra(G: WeightedGraph, [s, t]: [node, node]): path;
/**
 * @description Computes the shortest path from source node `s` to target node `t` on graph `G`, considering options `O`.
 * @param G Source graph
 * @param s Source node
 * @param t Target node
 * @param O Options for Dijkstra computing
 * @returns The shortest path from s to t.
 */
export function Dijkstra(G: WeightedGraph, [s, t]: [node, node], O: DijkstraOptions): path;
export function Dijkstra(G: WeightedGraph, [s, t]: [node, node] | [node], O?: DijkstraOptions): path | [Map<node, number>, Map<node, nodeOrNullNode>] {

    const dist = new Map<node, number>();
    const prev = new Map<node, nodeOrNullNode>();
    const Q = new FibonacciHeap<number, node>();
    const QMapping = new Map<node, INode<number, node> | null>();

    dist.set(s, 0);
    QMapping.set(s, Q.insert(0, s));
    for (const e of G.nodesIterator) {

        prev.set(e, nullNode);
        if (e != s) dist.set(e, Infinity);

    }

    while (!Q.isEmpty()) {

        const min = Q.extractMinimum()!; // Can't be null otherwise Q is empty
        QMapping.set(min.value!, null);

        if (t !== undefined && min.value === t) break;

        for (const v of G.neighborsIterator(min.value!) ?? []) {

            /**@description New alternative distance found from min, from a + (a,b) instead of b */
            const alt = min.key + G.weight(min.value!, v);

            if (O && alt > O.maxCumulWeight) continue;

            if (alt < (dist.get(v) ?? Infinity)) {

                dist.set(v, alt);
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
export function tracePath(prev: Map<node, nodeOrNullNode>, target: node, source?: node): path {

    let path: path = [];
    let e: nodeOrNullNode = target;
    if (prev.get(e) !== nullNode || (source && e === source)) { // If source === target, just return [target] (== [source])

        while (e !== nullNode) {

            path = [e, ...path];
            e = prev.get(e) ?? nullNode;

        }
    }

    return path;

}