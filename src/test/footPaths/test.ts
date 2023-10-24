import { HydratedDocument } from "mongoose";
import initDB from "../utils/mongoose";
import { benchmark } from "../utils/benchmark";
import { WorkerPool } from "../utils/Workers";

import { node, WeightedGraph } from "@catatomik/dijkstra/lib/utils/Graph";

import Point from "./utils/Point";
import Segment from "./utils/Segment";

export interface testOptions {
  getFullPaths?: boolean;
  computeGEOJSONs?: boolean;
  dijkstraOptions?: DijkstraOptions;
}
export type id = number;
export type footGraphNodes = number | ReturnType<typeof approachedStopName>;

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "core-js/features/reflect";

import sectionsModelInit, { dbSections } from "../models/sections.model";
import stopsModelInit, { dbTBM_Stops } from "../models/TBM_stops.model";
import { computePath, initialCallback } from "./computePath";
import { DocumentType } from "@typegoose/typegoose";
import {
  approachedStopName,
  euclidianDistance,
  computeGEOJSON,
  GEOJSON,
  sectionId,
  toWGS,
  dbIntersectionId,
  dbSectionId,
  unpackRefType,
} from "./utils/ultils";
import { writeFile } from "fs/promises";
import { TemplateCoordinates } from "proj4";
import FootGraphModelInit, { dbFootGraphEdges, dbFootGraphNodes } from "../models/FootGraph.model";
import FootPathsModelInit, { dbFootPaths } from "../models/FootPaths.model";
import { KeyOfMap } from "./utils";
import { DijkstraOptions } from "@catatomik/dijkstra";
import { unique, Deferred } from "../utils";

const sectionProjection = { coords: 1, distance: 1, rg_fv_graph_nd: 1, rg_fv_graph_na: 1, nom_voie: 1 };
export type dbSection = Pick<dbSections, keyof typeof sectionProjection>;
interface SectionOverwritten {
  /** Will never be populated, so force to be RefType */
  rg_fv_graph_nd: unpackRefType<dbSection["rg_fv_graph_nd"]> | ReturnType<typeof approachedStopName>;
  /** Will never be populated, so force to be RefType */
  rg_fv_graph_na: unpackRefType<dbSection["rg_fv_graph_nd"]> | ReturnType<typeof approachedStopName>;
}
export type Section = Omit<dbSection, keyof SectionOverwritten> & SectionOverwritten;

const stopProjection = { _id: 1, coords: 1, libelle: 1 };
export type Stop = Pick<dbTBM_Stops, keyof typeof stopProjection>;

export async function run({ getFullPaths = false, computeGEOJSONs = false, dijkstraOptions }: testOptions) {
  /** Data displaying.
   * Uses {@link proj4} with crs {@link https://epsg.io/2154}.
   */
  const GEOJSONs: GEOJSON[] = [];

  //Grab required data
  const db = await initDB();

  const sectionsModel = sectionsModelInit(db);
  const stopsModel = stopsModelInit(db);
  const [FootGraphModel, FootGraphNodesModel, FootGraphEdgesModel] = FootGraphModelInit(db);
  const FootPathModel = FootPathsModelInit(db);

  const limitTop = new Point(44.813926, -0.581271).fromWGSToLambert93();
  const limitBot = new Point(44.793123, -0.632578).fromWGSToLambert93();

  async function queryData() {
    //Important : sections are oriented => 2 entries per section
    const sections = new Map(
      (
        (await sectionsModel
          .find<HydratedDocument<DocumentType<Section>>>(
            {
              //Restrict domain
              $and: [
                { "coords.0.0": { $lte: limitTop.x } },
                { "coords.0.0": { $gte: limitBot.x } },
                { "coords.0.1": { $lte: limitTop.y } },
                { "coords.0.1": { $gte: limitBot.y } },
              ],
              cat_dig: {
                $in: [2, 3, 4, 5, 7, 9],
              },
            },
            sectionProjection,
          )
          .lean()
          // Coords field type lost...
          .exec()) as unknown as Section[]
      ).map((s) => [sectionId(s as { rg_fv_graph_nd: number; rg_fv_graph_na: number }), s] as const),
    );

    //Restricted domain
    const validIntersections = new Map(
      Array.from(sections.values())
        .flatMap((s) => [s.rg_fv_graph_nd as number, s.rg_fv_graph_na as number])
        .filter(unique)
        .map((intersectionId) => {
          return [
            intersectionId,
            {
              _id: intersectionId,
              coords: (Array.from(sections.values()).find((s) => s.rg_fv_graph_nd === intersectionId)?.coords[0] ??
                Array.from(sections.values())
                  .find((s) => s.rg_fv_graph_na === intersectionId)
                  ?.coords.at(-1))!,
            },
          ] as const;
        }),
    );

    const stops = new Map(
      (
        (await stopsModel
          .find<HydratedDocument<DocumentType<Stop>>>(
            {
              $and: [
                { coords: { $not: { $elemMatch: { $eq: Infinity } } } },
                //Restrict domain
                { "coords.0": { $lte: limitTop.x } },
                { "coords.0": { $gte: limitBot.x } },
                { "coords.1": { $lte: limitTop.y } },
                { "coords.1": { $gte: limitBot.y } },
              ],
            },
            stopProjection,
          )
          .lean()
          // Coords field type lost...
          .exec()) as unknown as Stop[]
      )
        .filter((s, _, arr) => !arr.find((ss) => s.coords[0] === ss.coords[0] && s.coords[1] === ss.coords[1] && s._id !== ss._id))
        .map((s) => [s._id, s]),
    );

    return {
      sections,
      validIntersections,
      stops,
    };
  }
  const b1 = await benchmark(queryData, []);
  console.log("b1 ended");
  if (!b1.lastReturn) throw `b1 return null`;
  const { validIntersections, sections, stops } = b1.lastReturn;

  /** Little helper to get a section easier */
  function getSection(nd: node, na: node) {
    return sections.get(sectionId({ rg_fv_graph_nd: nd, rg_fv_graph_na: na })) ?? sections.get(sectionId({ rg_fv_graph_nd: na, rg_fv_graph_na: nd }));
  }

  function makeGraph() {
    const footGraph = new WeightedGraph<footGraphNodes>();

    for (const s of sections.values()) {
      //Oriented but don't care (foot graph)
      footGraph.addEdge(s.rg_fv_graph_nd, s.rg_fv_graph_na, s.distance);
    }

    return footGraph;
  }
  const b2 = await benchmark(makeGraph, []);
  console.log("b2 ended");
  if (!b2.lastReturn) throw `b2 return null`;
  const footGraph = b2.lastReturn;

  if (computeGEOJSONs)
    GEOJSONs.push(
      computeGEOJSON(
        // footGraph.nodes,
        [],
        footGraph.arcs,
        () => [],
        // (node) =>
        //   toWGS(typeof node === "number" ? validIntersections.get(node)?.coords ?? [0, 0] : stops.get(parseInt(node.split("-")[0]))?.coords ?? [0, 0]),
        (arc) =>
          sections.get(sectionId({ rg_fv_graph_nd: arc[0], rg_fv_graph_na: arc[1] }))?.coords.map((coords) => toWGS(coords)) ?? [
            [0, 0],
            [0, 0],
          ],
        (node) => ({
          id: node,
          "marker-color": "#5a5a5a",
          "marker-size": "small",
        }),
        (arc) => ({
          nom: Array.from(sections.values()).find((s) => s.rg_fv_graph_nd === arc[0] && s.rg_fv_graph_na === arc[1])?.nom_voie || "Unknown",
        }),
      ),
    );

  //Compute approached stops
  function computeApproachedStops() {
    //Pre-generate segments to fasten the process (and not redundant computing)
    //A segment describes a portion of a section (oriented)
    const segments = new Map<KeyOfMap<typeof sections>, { n: number; seg: Segment }>();
    for (const arc of footGraph.arcs) {
      const sId = sectionId({ rg_fv_graph_nd: arc[0], rg_fv_graph_na: arc[1] });
      const section = sections.get(sId);
      if (!section) continue; // Added for ts mental health
      for (let i = 0; i < section.coords.length - 1; i++) {
        segments.set(sId, {
          n: i,
          seg: new Segment(new Point(...section.coords[i]), new Point(...section.coords[i + 1])),
        });
      }
    }

    /**@description [closest point, section containing this point, indice of segment composing the section] */
    const approachedStops = new Map<ReturnType<typeof approachedStopName>, [Point, KeyOfMap<typeof sections>, number]>();
    for (const [stopId, stop] of stops) {
      /**@description [distance to closest point, closest point, section containing this point, indice of segment composing the section (i;i+1 in Section coords)] */
      const closestPoint: [number, Point | null, KeyOfMap<typeof sections> | null, number | null] = [Infinity, null, null, null];

      for (const [sectionKey, { n, seg }] of segments) {
        const stopPoint: Point = new Point(...stop.coords);
        const localClosestPoint: Point = seg.closestPointFromPoint(stopPoint);
        const distance: number = Point.distance(stopPoint, localClosestPoint);
        if (distance < closestPoint[0]) {
          closestPoint[0] = distance;
          closestPoint[1] = localClosestPoint;
          closestPoint[2] = sectionKey;
          closestPoint[3] = n;
        }
      }

      if (closestPoint[1] !== null && closestPoint[2] !== null && closestPoint[3] !== null) {
        approachedStops.set(approachedStopName(stopId), [closestPoint[1], closestPoint[2], closestPoint[3]]);
        // else : couldn't find an approched stop (coords = Infinity)
      }
    }
    return approachedStops;
  }
  const b3 = await benchmark(computeApproachedStops, []);
  console.log("b3 ended");
  if (!b3.lastReturn) throw `b3 return null`;
  const approachedStops = b3.lastReturn;

  /** Update {@link footGraph} & {@link sections} */
  function refreshWithApproachedStops() {
    //Pushes new approached stops into graph, just like a proxy on a section
    for (const [stopId, [closestPoint, sectionKey, n]] of approachedStops) {
      const section = sections.get(sectionKey);
      if (!section) continue; // Added to ts mental health
      //Compute distance from section start to approachedStop
      const toApproadchedStop: number =
        section.coords.reduce((acc, v, i, arr) => {
          if (i < n && i < arr.length - 1) return acc + euclidianDistance(...v, ...arr[i + 1]);
          return acc;
        }, 0) + Point.distance(closestPoint, new Point(...section.coords[n]));

      //Compute distance form approachedStop to section end
      const fromApproachedStop: number =
        section.coords.reduce((acc, v, i, arr) => {
          if (i > n && i < arr.length - 1) return acc + euclidianDistance(...v, ...arr[i + 1]);
          return acc;
        }, 0) + Point.distance(closestPoint, new Point(...section.coords[n]));

      //Remove edge from p1 to p2
      footGraph.removeEdge(section.rg_fv_graph_nd, section.rg_fv_graph_na);
      sections.delete(sectionId(section));

      const insertedNode = stopId;
      //Insert new node approachedStop
      //Create edges from p1 to approachedStop, then from approachedStop to p2
      const subsectionToApproachedStop: Section = {
        coords: [...section.coords.slice(0, n + 1), [closestPoint.x, closestPoint.y]],
        distance: toApproadchedStop,
        nom_voie: section.nom_voie,
        rg_fv_graph_nd: section.rg_fv_graph_nd,
        rg_fv_graph_na: insertedNode,
      };
      footGraph.addEdge(section.rg_fv_graph_nd, insertedNode, toApproadchedStop);
      sections.set(sectionId({ rg_fv_graph_nd: section.rg_fv_graph_nd, rg_fv_graph_na: insertedNode }), subsectionToApproachedStop);

      const subsectionFromApproachedStop: Section = {
        coords: [[closestPoint.x, closestPoint.y], ...section.coords.slice(n + 1)],
        distance: fromApproachedStop,
        nom_voie: section.nom_voie,
        rg_fv_graph_nd: insertedNode,
        rg_fv_graph_na: section.rg_fv_graph_na,
      };
      footGraph.addEdge(insertedNode, section.rg_fv_graph_na, fromApproachedStop);
      sections.set(sectionId({ rg_fv_graph_nd: insertedNode, rg_fv_graph_na: section.rg_fv_graph_na }), subsectionFromApproachedStop);
    }
  }
  const b4 = await benchmark(refreshWithApproachedStops, []);
  console.log("b4 ended");

  if (computeGEOJSONs)
    GEOJSONs.push(
      computeGEOJSON(
        footGraph.nodes,
        footGraph.arcs,
        // () => [],
        (node) => {
          let coords: [number, number] = [0, 0];
          if (typeof node === "number") coords = validIntersections.get(node)?.coords ?? [0, 0];
          else {
            const approachedStopPoint = approachedStops.get(node as ReturnType<typeof approachedStopName>)?.[0];
            if (approachedStopPoint) coords = [approachedStopPoint.x, approachedStopPoint.y];
          }
          return toWGS(coords);
        },
        (arc) =>
          getSection(arc[0], arc[1])?.coords.map((coords) => toWGS(coords)) ?? [
            [0, 0],
            [0, 0],
          ],
        (node) => ({
          id: node,
          name: stops.get(typeof node === "string" ? parseInt(node.split("=")[1]) : node)?.libelle ?? "Unknown",
          "marker-color": typeof node === "string" ? "#ff0000" : "#5a5a5a",
          "marker-size": typeof node === "string" ? "medium" : "small",
        }),
        (arc) => ({
          name: getSection(arc[0], arc[1])?.nom_voie || "Unknown",
          distance: getSection(arc[0], arc[1])?.distance || "Unknown",
          sectionId: sectionId({ rg_fv_graph_nd: arc[0], rg_fv_graph_na: arc[1] }),
          stroke: typeof arc[0] === "string" || typeof arc[1] === "string" ? "#e60000" : "#5a5a5a",
        }),
      ),
    );

  async function computePaths() {
    //paths<source, <target, paths>>
    const paths: Map<KeyOfMap<typeof stops>, Awaited<ReturnType<typeof computePath>>> = new Map();

    const def = new Deferred<typeof paths>();

    const workerPool = new WorkerPool<typeof initialCallback, typeof computePath>(__dirname + "/computePath.js", 8, {
      adj: footGraph.adj,
      weights: footGraph.weights,
      stops: Array.from(stops.keys()),
      options: dijkstraOptions,
    });

    let rejected = false;

    for (const stopId of stops.keys()) {
      workerPool
        .run([approachedStopName(stopId), getFullPaths])
        .then((sourcePaths) => {
          paths.set(stopId, sourcePaths);
          if (paths.size === approachedStops.size) def.resolve(paths);
        })
        .catch((r) => {
          if (rejected) return;
          rejected = true;
          def.reject(r);
        });
    }

    return def.promise;
  }
  const b5 = await benchmark(computePaths, []);
  console.log("b5 ended");
  if (!b5.lastReturn) throw `b5 return null`;
  const paths = b5.lastReturn;

  // From "Les Harmonies"
  if (computeGEOJSONs)
    GEOJSONs.push(
      computeGEOJSON(
        footGraph.nodes,
        Array.from(paths.get(128738)!).filter(([_, [path]]) => path.length),
        (node) => {
          let coords: [number, number] = [0, 0];
          if (typeof node === "number") coords = validIntersections.get(node)?.coords ?? [0, 0];
          else {
            const approachedStopPoint = approachedStops.get(node as ReturnType<typeof approachedStopName>)?.[0];
            if (approachedStopPoint) coords = [approachedStopPoint.x, approachedStopPoint.y];
          }
          return toWGS(coords);
        },
        ([_, [path]]) =>
          path.reduce<TemplateCoordinates[]>(
            (acc, v, i) =>
              i < path.length - 1
                ? [
                    ...acc,
                    ...((
                      sections.get(sectionId({ rg_fv_graph_nd: v, rg_fv_graph_na: path[i + 1] }))?.coords ??
                      sections
                        .get(sectionId({ rg_fv_graph_nd: path[i + 1], rg_fv_graph_na: v }))
                        ?.coords // Make a copy & reverse to get coords in the right order, tricky
                        .slice()
                        .reverse()
                    )?.map((coords) => toWGS(coords)) ?? [
                      [0, 0],
                      [0, 0],
                    ]),
                  ]
                : acc,
            [],
          ),
        (node) => ({
          id: node,
          name: stops.get(typeof node === "string" ? parseInt(node.split("=")[1]) : node)?.libelle ?? "Unknown",
          "marker-color": typeof node === "string" ? "#ff0000" : "#5a5a5a",
          "marker-size": typeof node === "string" ? "medium" : "small",
        }),
        ([dest, [path, distance]]) => ({
          path: `${path[0]}-${dest}`,
          distance,
          stroke: "#8080ff",
        }),
      ),
    );

  //From "Les Harmonies" to "Peixotto"
  const specificPath = paths.get(128738)!.get(126798)!;
  if (computeGEOJSONs)
    GEOJSONs.push(
      computeGEOJSON(
        footGraph.nodes,
        specificPath[0].reduce<[node, node][]>((acc, node, i, path) => (i < path.length - 1 ? [...acc, [node, path[i + 1]]] : acc), []),
        (node) => {
          let coords: [number, number] = [0, 0];
          if (typeof node === "number") coords = validIntersections.get(node)?.coords ?? [0, 0];
          else {
            const approachedStopPoint = approachedStops.get(node as ReturnType<typeof approachedStopName>)?.[0];
            if (approachedStopPoint) coords = [approachedStopPoint.x, approachedStopPoint.y];
          }
          return toWGS(coords);
        },
        (path) =>
          path.reduce<TemplateCoordinates[]>(
            (acc, v, i) =>
              i === 0
                ? getSection(v, path[i + 1])?.coords.map((coords) => toWGS(coords)) ?? [
                    [0, 0],
                    [0, 0],
                  ]
                : acc,
            [],
          ),
        (node) => ({
          id: node,
          name: stops.get(typeof node === "string" ? parseInt(node.split("=")[1]) : node)?.libelle ?? "Unknown",
          "marker-color": typeof node === "string" ? "#ff0000" : "#5a5a5a",
          "marker-size": typeof node === "string" ? "medium" : "small",
        }),
        (path) => ({
          path: `${path[0]}-${path[path.length - 1]}`,
          totalDistance: specificPath[1],
          stroke: "#8080ff",
        }),
      ),
    );
  if (computeGEOJSONs) for (let i = 0; i < GEOJSONs.length; i++) await writeFile(__dirname + `/../../out-${i}.geojson`, JSON.stringify(GEOJSONs[i]));

  async function updateDb() {
    //Empty db
    await FootGraphModel.deleteMany({});

    await FootGraphNodesModel.insertMany(
      Array.from(validIntersections.values())
        .map<dbFootGraphNodes>(({ _id, coords }) => ({
          _id: dbIntersectionId(_id),
          coords,
        }))
        .concat(
          Array.from(approachedStops).map(([asId, [Point]]) => ({
            _id: asId,
            coords: [Point.x, Point.y],
          })),
        ),
    );

    await FootGraphEdgesModel.insertMany(
      Array.from(sections.values()).map<dbFootGraphEdges>((section, index) => ({
        _id: dbSectionId(index),
        coords: section.coords,
        distance: section.distance,
        ends: [
          typeof section.rg_fv_graph_nd === "number" ? dbIntersectionId(section.rg_fv_graph_nd) : section.rg_fv_graph_nd,
          typeof section.rg_fv_graph_na === "number" ? dbIntersectionId(section.rg_fv_graph_na) : section.rg_fv_graph_na,
        ],
      })),
    );

    await FootPathModel.deleteMany({});

    await FootPathModel.insertMany(
      Array.from(paths).map<dbFootPaths>(([from, [[to, [path, distance]]]]) => ({
        from,
        to,
        path: path.map((node) => (typeof node === "number" ? dbIntersectionId(node) : node)),
        distance,
      })),
    );
  }
  const b6 = await benchmark(updateDb, []);
  console.log("b6 ended");

  //End procedure
  await db.disconnect();

  return { b1, b2, b3, b4, b5, b6 };
}
