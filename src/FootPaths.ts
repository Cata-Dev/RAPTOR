import { node, WeightedGraph } from './utils/Graph';

export type path = node[];
/**
 * @description Generate the shortest paths from source node s to every nodes in graph G.
 * @param G Source graph
 * @param s Source node
 * @returns First, the distances from source node to considered node. Secondly, an array that traces downwards the shortest path from considered node to source node.
 */
export function Dijkstra(G: WeightedGraph, s: node): [Map<node, number>, Map<node, node>];
/**
 * @description Computes the shortest path from source node s to target node t.
 * @param G Source graph
 * @param s Source node
 * @param t Target node
 * @returns The shortest path from s to t.
 */
export function Dijkstra(G: WeightedGraph, s: node, t: node): path;
export function Dijkstra(G: WeightedGraph, s: node, t?: node): path | [Map<node, number>, Map<node, node>] {

    const dist: Map<node, number> = new Map();
    const prev: Map<node, node> = new Map();
    const Q: Set<node> = new Set();

    for (const e of G.nodes) {

        dist.set(e, Infinity);
        prev.set(e, null);
        Q.add(e);

    }
    dist.set(s, 0);

    while (Q.size) {

        let min: [node, number] = [null, Infinity];
        for (const e of Q) {
            const d: number = dist.get(e);
            if (d <= min[1]) min = [e, d];
        }
        const u: node = min[0];

        Q.delete(u);

        if (t && u === t) break;

        for (const v of G.neighbors(u)) {

            if (!Q.has(v)) continue;

            const alt = dist.get(u) + G.weight(u, v);
            if (alt < dist.get(v)) {

                dist.set(v, alt);
                prev.set(v, u);

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
export function tracePath(prev: Map<node, node>, target: node, source?: node): path {

    let path: path = [];
    let e: node = target;
    if (prev.get(e) || (source && e === source)) {

        while (e != null) {

            path = [e, ...path];
            e = prev.get(e);

        }
    }

    return path;

}