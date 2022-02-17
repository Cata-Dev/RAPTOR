export type node = string;

export class Graph {

    readonly adj: { [e: node]: Array<node> };

    constructor() {
        this.adj = {};
    }

    /**
     * @description Add a node to the graph
     * @param e A node of the graph
     */
    add_node(e: node): Graph {
        if (!(e in this.adj)) this.adj[e] = [];
        return this;
    }

    /**
     * @description And an arc between two nodes e1 and e2
     * @param e1 A node of the graph
     * @param e2 A node of the graph
     */
    add_arc(e1: node, e2: node): Graph {
        this.add_node(e1);
        this.add_node(e2);
        this.adj[e1].push(e2);
        return this;
    }

    /**
     * @description Add an edge between two nodes e1 and e2
     * @param e1 A node of the graph
     * @param e2 A node of the graph
     */
    add_edge(e1: node, e2: node): Graph {
        this.add_arc(e1, e2);
        this.add_arc(e2, e1);
        return this;
    }

    /**
     * @description Check the existence of an arc between two nodes e1 and e2
     * @param e1 A node of the graph
     * @param e2 A node of the graph
     */
    arc(e1: node, e2: node): boolean {
        return this.neighbors(e1).find(e => e == e2) ? true : false;
    }

    /**
     * @description Check the existence of an edge between e1 and e2
     * @param e1 A node of the graph
     * @param e2 A node of the graph
     */
    arete(e1: node, e2: node): boolean {
        return this.arc(e1, e2) && this.arc(e2, e1);
    }

    /**
     * @description Test wether e1 and e2 are adjacent
     * @param e1 A node of the graph
     * @param e2 A node of the graph
     */
    adjacent(e1: node, e2: node): boolean {
        return this.arc(e1, e2) || this.arc(e2, e1);
    }

    /**
     * @description The nodes of the graph
     */
    get nodes(): Array<node> {
        return Object.keys(this.adj);
    }

    /**
     * @returns The order of the graph
     */
    get ordre(): number {
        return this.nodes.length;
    }

    /**
     * @returns The neighbors of the edge e
     * @param e A node of the graph
     */
    neighbors(e: node): Array<node> {
        return this.adj[e] || [];
    }

    /**
     * @returns The degree of the node e
     * @param e A node of the graph
     */
    degre(e: node): number {
        return this.neighbors(e).length;
    }

    /**
     * @returns Number of arcs
     */
    get nbArcs(): number {
        return this.nodes.reduce((acc, v) => acc+this.degre(v), 0);
    }

    /**
     * @returns Number of double oriented arcs
     */
    get nbArcsDbSens(): number {
        let c = 0 ;
        const e = this.nodes;
        for (let x = 0; x < e.length; x++) {
            for (let y = x; y < e.length; y++) {
                if (this.arc(e[x], e[y]) && this.arc(e[y], e[x])) c += 1;
            }
        }
        return c;
    }

    /**
     * @returns A list including the node with maximal degree and his degree
     */
    get nodeMaxDegree(): [node, number] {
        let max: [node, number] = [null, 0];
        for (let e of this.nodes) {
            if (max[1] < this.degre(e)) max = [e, this.degre(e)];
        }
        return max;
    }

    /**
     * @returns A list including the node with minimal degree and his degree
     */
     get nodeMinDegree(): [node, number] {
        let min: [node, number] = [null, Infinity];
        for (let e of this.nodes) {
            if (min[1] > this.degre(e)) min = [e, this.degre(e)];
            if (min[1] == 0) break;
        }
        return min;
    }

    /**
     * @description A list including the nodes that are connected (source or target) with the node e
     * @param e A node of the graph
     */
    connections(e: node): Array<any> {
        return this.nodes.filter(e1 => this.adjacent(e, e1));
    }

}

export class WeightedGraph extends Graph {

    readonly weights: { [arc: node]: number };

    constructor() {
        super();
        this.weights = {};
    }

    /**
     * @description Add an arc between e1 and e2
     * @param e1 A node of the graph
     * @param e2 A node of the graph
     * @param w The weight of this arc
     */
    add_arc(e1: node, e2: node, w?: number): WeightedGraph {
        super.add_arc(e1, e2);
        this.weights[`${e1}-${e2}`] = w;
        return this;
    }

    /**
     * @description Add an edge between two nodes e1 and e2
     * @param e1 A node of the graph
     * @param e2 A node of the graph
     * @param w The weight of this arc
     */
     add_edge(e1: node, e2: node, w?: number): WeightedGraph {
        this.add_arc(e1, e2, w);
        this.add_arc(e2, e1, w);
        return this;
    }

    weight(e1: node, e2: node): number {
        if (!this.arc(e1, e2)) throw new Error("Invalid nodes");
        return this.weights[`${e1}-${e2}`];
    }

}