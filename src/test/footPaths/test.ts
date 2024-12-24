import { DijkstraOptions } from "@catatomik/dijkstra";
export interface testOptions {
  getFullPaths?: boolean;
  computeGEOJSONs?: boolean;
  dijkstraOptions?: DijkstraOptions;
}

export type FootStopsGraphNode = FootGraphNode<ReturnType<typeof approachedStopName>>;

import { node } from "@catatomik/dijkstra/lib/utils/Graph";
import { writeFile } from "fs/promises";
import { cpus } from "os";
import { TemplateCoordinates } from "proj4";
import { Deferred, unique } from "../utils";
import { benchmark, Duration } from "../utils/benchmark";
import initDB from "../utils/mongoose";
import { WorkerPool } from "../utils/Workers";
import { computePath, initialCallback } from "./computePath";
import { KeyOfMap } from "./utils";
import { approachPoint, FootGraphNode, initData, makeGraph, refreshWithApproachedPoint, Section } from "./utils/graph";
import Point from "./utils/Point";
import { approachedStopName, computeGEOJSON, GEOJSON, sectionId, toWGS } from "./utils/ultils";

// Needed to solve "Reflect.getMetadata is not a function" error of typegoose
import "core-js/features/reflect";

import FootGraphModelInit from "../models/FootGraph.model";
import sectionsModelInit from "../models/sections.model";
import stopsModelInit, { dbTBM_Stops } from "../models/TBM_stops.model";
import { ProjectionType } from "mongoose";

const stopProjection = { _id: 1, coords: 1, libelle: 1 } satisfies ProjectionType<dbTBM_Stops>;
type dbStops = Pick<dbTBM_Stops, keyof typeof stopProjection>;
interface StopOverwritten {
  // Remove it
  _id?: never;
}
// Equivalent to an Edge
type Stop = Omit<dbStops, keyof StopOverwritten> & StopOverwritten;

export async function run({ getFullPaths = false, computeGEOJSONs = false, dijkstraOptions }: testOptions) {
  /** Data displaying.
   * Uses {@link proj4} with crs {@link https://epsg.io/2154}.
   */
  const GEOJSONs: GEOJSON[] = [];

  const db = await initDB();

  const sectionsModel = sectionsModelInit(db);
  const stopsModel = stopsModelInit(db);
  const FootGraphModel = FootGraphModelInit(db);

  const limitTop = new Point(44.84264233493587, -0.5405778677677929).fromWGSToLambert93();
  const limitBot = new Point(44.80597316767652, -0.5936222119727218).fromWGSToLambert93();
  // const limitTop = new Point(44.813926, -0.581271).fromWGSToLambert93();
  // const limitBot = new Point(44.793123, -0.632578).fromWGSToLambert93();

  async function queryData() {
    // Query data
    const { edges, mappedSegments } = await initData(sectionsModel, {
      $and: [
        { "coords.0.0": { $lte: limitTop.x } },
        { "coords.0.0": { $gte: limitBot.x } },
        { "coords.0.1": { $lte: limitTop.y } },
        { "coords.0.1": { $gte: limitBot.y } },
      ],
    })();
    const sectionsById = new Map<
      ReturnType<typeof sectionId> | ReturnType<typeof approachedStopName>,
      Omit<Section, "t" | "s"> & {
        t: Section["t"] | ReturnType<typeof approachedStopName>;
        s: Section["s"] | ReturnType<typeof approachedStopName>;
      }
    >(Array.from(edges.values()).map((s) => [sectionId(s), s] satisfies [unknown, unknown]));

    // Restricted domain
    const validIntersections = new Map(
      Array.from(edges.values())
        .flatMap(({ s, t }) => [s, t])
        .filter(unique)
        .map((intersectionId) => {
          return [
            intersectionId,
            {
              _id: intersectionId,
              coords: (Array.from(edges.values()).find(({ s }) => s === intersectionId)?.coords[0] ??
                Array.from(edges.values())
                  .find(({ t }) => t === intersectionId)
                  ?.coords.at(-1))!,
            },
          ] as const;
        }),
    );

    // Query stops
    const stops = new Map<dbStops["_id"], Stop>(
      (
        await stopsModel
          .find(
            {
              $and: [
                { coords: { $not: { $elemMatch: { $eq: Infinity } } } },
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
          .exec()
      ).map((s) => [s._id, { coords: s.coords, libelle: s.libelle }]),
    );

    return { edges, sectionsById, stops, mappedSegments, validIntersections };
  }
  const qData = await benchmark(queryData, []);
  if (qData.lastReturn === null) throw new Error("Queried data null");
  const { edges, sectionsById, stops, mappedSegments, validIntersections } = qData.lastReturn;

  /** Little helper to get a section easier */
  function getSection<S extends { s: node; t: node }>(section: S) {
    return sectionsById.get(sectionId(section)) ?? sectionsById.get(sectionId(section));
  }

  // Make graph
  const graph = makeGraph<FootStopsGraphNode>(edges);

  if (computeGEOJSONs)
    GEOJSONs.push(
      computeGEOJSON(
        // footGraph.nodes,
        [],
        graph.arcs,
        () => [],
        // (node) =>
        //   toWGS(typeof node === "number" ? validIntersections.get(node)?.coords ?? [0, 0] : stops.get(parseInt(node.split("-")[0]))?.coords ?? [0, 0]),
        ([s, t]) =>
          sectionsById.get(sectionId({ s, t }))?.coords.map((coords) => toWGS(coords)) ?? [
            [0, 0],
            [0, 0],
          ],
        (node) => ({
          id: node,
          "marker-color": "#5a5a5a",
          "marker-size": "small",
        }),
        ([s, t]) => ({
          nom: sectionsById.get(sectionId({ s, t }))?.nom_voie ?? "Unknown",
        }),
      ),
    );

  function approachStops() {
    // Approach stops & insert
    const approachedStops = new Map<dbStops["_id"], NonNullable<ReturnType<typeof approachPoint>>>();

    for (const [stopId, { coords }] of stops) {
      const ap = approachPoint(mappedSegments, coords);
      if (ap) {
        const apn = approachedStopName(stopId);
        approachedStops.set(stopId, ap);
        const [toApproachedStop, fromApproachedStop] = refreshWithApproachedPoint(edges, graph, apn, ap);

        const [pt, sId, k] = ap;

        const edge = edges.get(sId)!;
        sectionsById.delete(sectionId(edge));

        // Keep track of sections for drawing
        const subsectionToApproachedStop: Omit<Section, "t"> & { t: Section["t"] | ReturnType<typeof approachedStopName> } = {
          coords: [...edge.coords.slice(0, k + 1), [pt.x, pt.y]],
          distance: toApproachedStop,
          nom_voie: edge.nom_voie,
          s: edge.s,
          t: apn,
        };
        sectionsById.set(sectionId(subsectionToApproachedStop), subsectionToApproachedStop);

        const subsectionFromApproachedStop: Omit<Section, "t" | "s"> & {
          t: Section["t"] | ReturnType<typeof approachedStopName>;
          s: Section["s"] | ReturnType<typeof approachedStopName>;
        } = {
          coords: [[pt.x, pt.y], ...edge.coords.slice(k + 1)],
          distance: fromApproachedStop,
          nom_voie: edge.nom_voie,
          s: apn,
          t: edge.t,
        };
        sectionsById.set(sectionId(subsectionFromApproachedStop), subsectionFromApproachedStop);
      }
    }

    return approachedStops;
  }
  const appStops = await benchmark(approachStops, []);
  if (appStops.lastReturn === null) throw new Error("Approached stops null");
  const approachedStops = appStops.lastReturn;

  if (computeGEOJSONs)
    GEOJSONs.push(
      computeGEOJSON(
        graph.nodes,
        graph.arcs,
        // () => [],
        (node) => {
          let coords: [number, number] = [0, 0];
          if (typeof node === "number") coords = validIntersections.get(node)?.coords ?? coords;
          else {
            const approachedStopPoint = approachedStops.get(parseInt(node.split("=")[1]))?.[0];
            if (approachedStopPoint) coords = [approachedStopPoint.x, approachedStopPoint.y];
          }
          return toWGS(coords);
        },
        ([s, t]) =>
          sectionsById.get(sectionId({ s, t }))?.coords.map((coords) => toWGS(coords)) ?? [
            [0, 0],
            [0, 0],
          ],
        (node) => ({
          id: node,
          name: stops.get(typeof node === "string" ? parseInt(node.split("=")[1]) : node)?.libelle ?? "Unknown",
          "marker-color": typeof node === "string" ? "#ff0000" : "#5a5a5a",
          "marker-size": typeof node === "string" ? "medium" : "small",
        }),
        ([s, t]) => ({
          name: sectionsById.get(sectionId({ s, t }))?.nom_voie ?? "Unknown",
          distance: sectionsById.get(sectionId({ s, t }))?.distance ?? "Unknown",
          sectionId: sectionId({ s, t }),
          stroke: typeof s === "string" || typeof t === "string" ? "#e60000" : "#5a5a5a",
        }),
      ),
    );

  function computePaths() {
    // Compute all paths

    // paths<source, <target, paths>>
    const paths = new Map<KeyOfMap<typeof stops>, Awaited<ReturnType<typeof computePath>>>();

    const def = new Deferred<typeof paths>();

    const workerPool = new WorkerPool<typeof initialCallback, typeof computePath>(__dirname + "/computePath.js", cpus().length, {
      adj: graph.adj,
      weights: graph.weights,
      stops: Array.from(stops.keys()),
      options: dijkstraOptions,
    });

    const LOG_EVERY = 5;
    let lastChunkInsertLogTime = Date.now();
    let rejected = false;
    let totalCount = 0;

    for (const stopId of approachedStops.keys()) {
      workerPool
        .run([approachedStopName(stopId), getFullPaths])
        .then((sourcePaths) => {
          paths.set(stopId, sourcePaths);
          totalCount += sourcePaths.size;
          if (paths.size === approachedStops.size) def.resolve(paths);
        })
        .catch((r) => {
          if (rejected) return;
          rejected = true;
          def.reject(r);
        })
        .finally(() => {
          if (paths.size % Math.round((stops.size / 100) * LOG_EVERY) === 0) {
            const newTime = Date.now();
            const progress = Math.round((paths.size / stops.size) * 1000) / 10;
            console.log(
              `Computing ATA paths done at ${progress}% (${totalCount}). Time since last ${LOG_EVERY}% compute & insert : ${new Duration(newTime - lastChunkInsertLogTime)}`,
            );
            lastChunkInsertLogTime = newTime;
          }
        });
    }

    return def.promise;
  }
  const retComp = await benchmark(computePaths, []);
  if (retComp.lastReturn === null) throw new Error(`Paths null`);
  const paths = retComp.lastReturn;

  if (computeGEOJSONs)
    GEOJSONs.push(
      computeGEOJSON(
        graph.nodes,
        Array.from(paths.get(3094)!).filter(([_, [path]]) => path.length),
        (node) => {
          let coords: [number, number] = [0, 0];
          if (typeof node === "number") coords = validIntersections.get(node)?.coords ?? [0, 0];
          else {
            const approachedStopPoint = approachedStops.get(parseInt(node.split("=")[1]))?.[0];
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
                      getSection({ s: v, t: path[i + 1] })?.coords ??
                      sectionsById
                        .get(sectionId({ s: path[i + 1], t: v }))
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

  const specificPath = paths.get(3094)?.get(829) ?? paths.get(829)?.get(3094);
  if (computeGEOJSONs && specificPath)
    GEOJSONs.push(
      computeGEOJSON(
        graph.nodes,
        specificPath[0].reduce<[node, node][]>((acc, node, i, path) => (i < path.length - 1 ? [...acc, [node, path[i + 1]]] : acc), []),
        (node) => {
          let coords: [number, number] = [0, 0];
          if (typeof node === "number") coords = validIntersections.get(node)?.coords ?? [0, 0];
          else {
            const approachedStopPoint = approachedStops.get(parseInt(node.split("=")[1]))?.[0];
            if (approachedStopPoint) coords = [approachedStopPoint.x, approachedStopPoint.y];
          }
          return toWGS(coords);
        },
        (path) =>
          path.reduce<TemplateCoordinates[]>(
            (acc, v, i) =>
              i === 0
                ? (getSection({ s: v, t: path[i + 1] })?.coords.map((coords) => toWGS(coords)) ?? [
                    [0, 0],
                    [0, 0],
                  ])
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
    // Empty db
    await FootGraphModel.deleteMany({});

    await FootGraphModel.insertMany(
      graph.edges.map(([s, t]) => ({
        distance: graph.weight(s, t),
        ends: [s, t],
      })),
    );
  }
  await benchmark(updateDb, []);

  // End procedure
  await db.disconnect();
}
