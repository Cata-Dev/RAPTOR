import { ProjectionType, RootFilterQuery } from "mongoose";
import { node, WeightedGraph } from "@catatomik/dijkstra/lib/utils/Graph";
import { dbSections as dbSectionsRaw, dbSectionsModel } from "../../models/sections.model";
import Point from "./Point";
import Segment from "./Segment";
import { euclideanDistance } from "./ultils";

const sectionsProjection = {
  _id: 1,
  nom_voie: 1,
  coords: 1,
  distance: 1,
  rg_fv_graph_nd: 1,
  rg_fv_graph_na: 1,
} satisfies ProjectionType<dbSectionsRaw>;
type dbSections = Pick<dbSectionsRaw, keyof typeof sectionsProjection>;
interface SectionOverwritten {
  // Remove it
  _id?: never;
  // Rename them
  rg_fv_graph_nd?: never;
  rg_fv_graph_na?: never;
  // Will never be populated
  s: dbSectionsRaw["rg_fv_graph_nd"];
  t: dbSectionsRaw["rg_fv_graph_na"];
}
// Equivalent to an Edge
type Section = Omit<dbSections, keyof SectionOverwritten> & SectionOverwritten;

interface Data {
  edges: Map<Section["s"], Section>;
  mappedSegments: Map<Section["s"], Segment[]>;
}

type FootGraphNode<N extends node> = Section["s"] | N;

function initData(sectionsModel: dbSectionsModel, additionalQuery: RootFilterQuery<dbSectionsRaw> = {}): () => Promise<Data & { updated: boolean }> {
  const dataCache = {
    date: -1,
    updated: false as boolean,
    edges: new Map() as Data["edges"],
    mappedSegments: new Map() as Data["mappedSegments"],
  } satisfies Data & { date: number; updated: boolean };

  // Might be a shallow copy!
  return async () => {
    const lastUpdate = (await sectionsModel.find({}, { updatedAt: 1 }).sort({ updatedAt: -1 }).limit(1))[0]?.updatedAt?.getTime() ?? -1;

    if (dataCache.date >= lastUpdate) {
      // Use cache
      dataCache.updated = false;
      return dataCache;
    }

    // Query graph data
    dataCache.edges = new Map<dbSections["_id"], Section>(
      (
        await sectionsModel
          .find({ $and: [{ rg_fv_graph_nd: { $ne: null } }, { rg_fv_graph_na: { $ne: null } }, additionalQuery] }, sectionsProjection)
          .lean()
      ).map<[number, Section]>(({ _id, coords, distance, rg_fv_graph_nd: s, rg_fv_graph_na: t, nom_voie }) => [
        _id,
        { coords, distance, s, t, nom_voie } satisfies Section,
      ]),
    );

    // Pre-generate mapped segments to fasten the process (and not redundant computing)
    // A segment describes a portion of an edge
    dataCache.mappedSegments = new Map<dbSections["_id"], Segment[]>();
    for (const [id, edge] of dataCache.edges) {
      dataCache.mappedSegments.set(
        id,
        edge.coords.reduce<Segment[]>(
          (acc, v, i) => (i >= edge.coords.length - 1 ? acc : [...acc, new Segment(new Point(...v), new Point(...edge.coords[i + 1]))]),
          [],
        ),
      );
    }

    dataCache.updated = true;

    return dataCache;
  };
}

/**
 * Makes graph from data, disconnected from data (no relation with shallow/deep copy)
 */
function makeGraph<N extends node>(edges: Data["edges"]) {
  const footGraph = new WeightedGraph<FootGraphNode<N>>();

  for (const { s, t, distance } of edges.values()) {
    footGraph.addEdge(s, t, distance);
  }

  return footGraph;
}

/**
 *
 * @param coords
 * @returns `[closest point, edge containing this point, indice of segment composing the edge]`
 */
function approachPoint(mappedSegments: Data["mappedSegments"], coords: [number, number]): [Point, Section["s"], number] | null {
  const point = new Point(...coords);

  /**@description [distance to closest point, closest point, edge containing this point, indice of segment composing the edge (i;i+1 in Section coords)] */
  const closestPoint: [number, Point | null, Section["s"] | null, number | null] = [Infinity, null, null, null];

  for (const [edge, segs] of mappedSegments) {
    for (const [n, seg] of segs.entries()) {
      const localClosestPoint = seg.closestPointFromPoint(point);
      const distance = Point.distance(point, localClosestPoint);
      if (distance < closestPoint[0]) {
        closestPoint[0] = distance;
        closestPoint[1] = localClosestPoint;
        closestPoint[2] = edge;
        closestPoint[3] = n;
      }
    }
  }

  // Max distance to closest segment (section)
  return closestPoint[0] < 10e3 && closestPoint[1] !== null && closestPoint[2] !== null && closestPoint[3] !== null
    ? [closestPoint[1], closestPoint[2], closestPoint[3]]
    : null;
}

/**
 * Pushes approached point into graph, just like a proxy on a edge
 * @returns Name of point added to graph
 */
function refreshWithApproachedPoint<N extends node>(
  edges: Data["edges"],
  footGraph: WeightedGraph<FootGraphNode<N>>,
  name: N,
  [closestPoint, edgeId, n]: Exclude<ReturnType<typeof approachPoint>, null>,
) {
  const { coords, s, t } = edges.get(edgeId)!;

  // Compute distance from start edge to approachedStop
  const toApproachedStop: number =
    coords.reduce((acc, v, i, arr) => {
      if (i < n && i < arr.length - 1) return acc + euclideanDistance(...v, ...arr[i + 1]);
      return acc;
    }, 0) + Point.distance(closestPoint, new Point(...coords[n]));

  // Compute distance form approachedStop to end edge
  const fromApproachedStop: number =
    coords.reduce((acc, v, i, arr) => {
      if (i > n && i < arr.length - 1) return acc + euclideanDistance(...v, ...arr[i + 1]);
      return acc;
    }, 0) + Point.distance(closestPoint, new Point(...coords[n]));

  // Remove edge from p1 to p2
  footGraph.removeEdge(s, t);

  footGraph.addEdge(s, name, toApproachedStop);
  footGraph.addEdge(name, t, fromApproachedStop);

  return [toApproachedStop, fromApproachedStop];
}

export { initData, makeGraph, approachPoint, refreshWithApproachedPoint };
export type { FootGraphNode };

export type { Section };
