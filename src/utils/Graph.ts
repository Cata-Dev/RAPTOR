export type node = string | number;
export const nullNode = Symbol("nullNode");
export type nodeOrNullNode = typeof nullNode | node;
export type arc = [node, node];
export type edge = arc;
export type weightedEdge = [...edge, number];

export class Graph {
  readonly adj: Map<node, Set<node>>;

  constructor(adj?: Map<node, Set<node>>) {
    if (adj instanceof Map) {
      this.adj = adj;
    } else this.adj = new Map();
  }

  /**
   * @description Add a node to the graph
   * @param n A node of the graph
   */
  add_node(n: node): Graph {
    if (!this.adj.has(n)) this.adj.set(n, new Set());
    return this;
  }

  /**
   * @description Add an arc from node n1 to node n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   */
  add_arc(n1: node, n2: node): Graph {
    this.add_node(n1);
    this.add_node(n2);
    this.adj.get(n1)?.add(n2);
    return this;
  }

  /**
   * @description Remove an arc from node n1 to node n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   */
  remove_arc(n1: node, n2: node): Graph {
    this.adj.get(n1)?.delete(n2);
    return this;
  }

  /**
   * @description Add an edge between two nodes n1 and n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   */
  add_edge(n1: node, n2: node): Graph {
    this.add_arc(n1, n2);
    this.add_arc(n2, n1);
    return this;
  }

  /**
   * @description Remove an edge between two nodes n1 and n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   */
  remove_edge(n1: node, n2: node): Graph {
    this.remove_arc(n1, n2);
    this.remove_arc(n2, n1);
    return this;
  }

  /**
   * @description Check the existence of an arc between two nodes n1 and n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   */
  arc(n1: node, n2: node): boolean {
    return !!this.adj.get(n1)?.has(n2);
  }

  /**
   * @description Check the existence of an edge between n1 and n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   */
  edge(n1: node, n2: node): boolean {
    return this.arc(n1, n2) && this.arc(n2, n1);
  }

  /**
   * @description Test wether n1 and n2 are adjacent
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   */
  adjacent(n1: node, n2: node): boolean {
    return this.arc(n1, n2) || this.arc(n2, n1);
  }

  /**
   * @description The nodes of the graph
   */
  get nodesIterator(): IterableIterator<node> {
    return this.adj.keys();
  }

  /**
   * @description The nodes of the graph
   */
  get nodes(): Array<node> {
    return Array.from(this.nodesIterator);
  }

  /**
   * @returns The order of the graph
   */
  get ordre(): number {
    return this.adj.size;
  }

  /**
   * @returns The neighbors of the node n
   * @param n A node of the graph
   */
  neighborsIterator(n: node): IterableIterator<node> | undefined {
    return this.adj.get(n)?.values();
  }

  /**
   * @returns The neighbors of the node n
   * @param n A node of the graph
   */
  neighbors(n: node): Array<node> {
    return Array.from(this.neighborsIterator(n) ?? []);
  }

  /**
   * @returns The degree of the node n
   * @param n A node of the graph
   */
  degree(n: node): number {
    return this.adj.get(n)?.size ?? 0;
  }

  /**
   * @returns The edges of the graph
   */
  get edges(): Array<edge> {
    const edges: Array<edge> = [];
    const n = this.nodes;
    for (let x = 0; x < n.length; x++) {
      for (let y = x; y < n.length; y++) {
        if (this.edge(n[x], n[y])) edges.push([n[x], n[y]]);
      }
    }

    return edges;
  }

  /**
   * @returns The arcs of the graph
   */
  get arcs(): Array<edge> {
    const arcs: Array<edge> = [];
    const n = this.nodes;
    for (let x = 0; x < n.length; x++) {
      for (let y = 0; y < n.length; y++) {
        if (this.arc(n[x], n[y])) arcs.push([n[x], n[y]]);
      }
    }

    return arcs;
  }

  /**
   * @description A list including the nodes that are connected (source or target) with the node n
   * @param n A node of the graph
   */
  connections(n: node): Array<any> {
    return this.nodes.filter((n1) => this.adjacent(n, n1));
  }
}

export class WeightedGraph extends Graph {
  readonly weights: Map<node, number>;

  constructor(adj?: Map<node, Set<node>>, weights?: Map<node, number>) {
    if (adj instanceof Map && weights instanceof Map) {
      super(adj);
      this.weights = weights;
    } else {
      super();
      this.weights = new Map();
    }
  }

  /**
   * @description Add an arc from node n1 to node n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   * @param w The weight of this arc
   */
  add_arc(n1: node, n2: node, w: number = 0): WeightedGraph {
    super.add_arc(n1, n2);
    this.weights.set(`${n1}-${n2}`, w);
    return this;
  }

  /**
   * @description Remove an arc from node n1 to node n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   */
  remove_arc(n1: node, n2: node): WeightedGraph {
    super.remove_arc(n1, n2);
    this.weights.delete(`${n1}-${n2}`);
    return this;
  }

  /**
   * @description Add an edge between two nodes n1 and n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   * @param w The weight of this arc
   */
  add_edge(n1: node, n2: node, w?: number): WeightedGraph {
    this.add_arc(n1, n2, w);
    this.add_arc(n2, n1, w);
    return this;
  }

  /**
   * @description Remove an edge between two nodes n1 and n2
   * @param n1 A node of the graph
   * @param n2 A node of the graph
   */
  remove_edge(n1: node, n2: node): WeightedGraph {
    this.remove_arc(n1, n2);
    this.remove_arc(n2, n1);
    return this;
  }

  weight(n1: node, n2: node): number {
    if (!this.arc(n1, n2)) throw new Error("Invalid nodes");
    return this.weights.get(`${n1}-${n2}`)!;
  }
}
