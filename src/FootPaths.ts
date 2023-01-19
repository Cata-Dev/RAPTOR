import { node, nodeOrNullNode, nullNode, WeightedGraph } from './utils/Graph';

export type path = node[];

interface DijkstraOptions {
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

    const dist: Map<node, number> = new Map();
    const prev: Map<node, nodeOrNullNode> = new Map();
    const Q: Set<node> = new Set();

    for (const e of G.nodesIterator) {

        dist.set(e, Infinity);
        prev.set(e, nullNode);
        Q.add(e);

    }
    dist.set(s, 0);

    while (Q.size) {

        let min: [nodeOrNullNode, number] = [nullNode, Infinity];
        for (const e of Q) {
            /**@description Distance to e */
            const d: number = dist.get(e) ?? Infinity;
            if (d <= min[1]) min[0] = e, min[1] = d;
        }

        if (min[0] === nullNode) break; // Added for ts mental health

        Q.delete(min[0]);

        if (t && min[0] === t) break;

        for (const v of G.neighborsIterator(min[0]) ?? []) {

            if (!Q.has(v)) continue;

            /**@description New alternative distance found from min, from a + (a,b) instead of b */
            const alt = (dist.get(min[0]) ?? Infinity) + G.weight(min[0], v);
            if (alt <= (O?.maxCumulWeight ?? Infinity) && alt < (dist.get(v) ?? Infinity)) {

                dist.set(v, alt);
                prev.set(v, min[0]);

            }

        }

    }

    if (t) {

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