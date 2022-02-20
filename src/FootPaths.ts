import { node, WeightedGraph } from './utils/Graph';

/**
 * @description Generate the shortest paths from source node s to every nodes in graph G.
 * @param G Source graph
 * @param s Source node
 * @returns First, the distances from source node to considered node. Secondly, an array that traces downwards the shortest path from considered node to source node.
 */
export default function Dijkstra(G: WeightedGraph, s: node): [number[], node[]];
/**
 * @description Computes the shortest path from source node s to target node t.
 * @param G Source graph
 * @param s Source node
 * @param t Target node
 */
export default function Dijkstra(G: WeightedGraph, s: node, t: node): node[];
export default function Dijkstra(G: WeightedGraph, s: node, t?: node): node[] | [number[], node[]] {

    const nodes: node[] = G.nodes;

    const dist: Array<number> = new Array(nodes.length);
    const prev: Array<node> = new Array(nodes.length);
    const Q: Set<node> = new Set();

    for (let e of nodes) {

        dist[e] = Infinity;
        prev[e] = null;
        Q.add(e);

    }
    dist[s] = 0;

    while (Q.size) {

        const u: node = ((): node => {
            let min: [node, number] = [null, Infinity];
            for (let e of Q) {
                const d: number = dist[e];
                if (d < min[1]) min = [e, d];
            }
            return min[0];
        })()

        Q.delete(u);

        if (t && u === t) break;

        for (let v of G.neighbors(u)) {

            if (!Q.has(v)) continue;

            const alt = dist[u] + G.weight(u, v);
            if (alt < dist[v]) {

                dist[v] = alt;
                prev[v] = u;

            }

        }

    }

    if (t) {

        let path: Array<node> = [];
        let e: node = t;
        if (prev[e] || e === s) {

            while (e != null) {

                path = [e, ...path];
                e = prev[e];

            }

        }

        return path;

    } else return [dist, prev];

}