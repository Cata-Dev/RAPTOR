import { model } from 'mongoose';
import db from './utils/mongoose';
import { benchmark } from './utils/benchmark';
import { WorkerPool } from './utils/Workers';

import { WeightedGraph } from '../utils/Graph';

import Point from '../utils/Point';
import Segment from '../utils/Segment';

export type id = number;

function cartographicDistance(x1: number, y1: number, x2: number, y2: number): number {

    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

}

import sectionsModelInit, { dbSections } from "./models/sections.model"
import stopsModelInit, { dbTBM_Stops } from "./models/TBM_stops.model"
import { computePath, initialCallback } from './computePath';

export type Section = Pick<dbSections, "_id" | "coords" | "distance" | "rg_fv_graph_dbl" | "rg_fv_graph_nd" | "rg_fv_graph_na">;
export type Stop = Pick<dbTBM_Stops, "_id" | "coords">;

async function run() {

    //Grab required data
    await db();

    const sectionsModel = sectionsModelInit(model);
    const stopsModel = stopsModelInit(model);

    async function queryData() {

        //Important : sections are oriented.
        //ERROR : there can be 2 sections (or more) linking the same nd to the same na. They need to be both differentiated (by their _id, for example).
        const sections = await sectionsModel.find({}).select({ _id: 1, coords: 1, distance: 1, rg_fv_graph_dbl: 1, rg_fv_graph_nd: 1, rg_fv_graph_na: 1 }).lean().exec() as unknown as Section[];
        //Map section, from s1 to s2 (oriented).
        const mapppedSections: Map<string, Section> = new Map();
        for (const s of sections) {
            mapppedSections.set(`${s.rg_fv_graph_nd}-${s.rg_fv_graph_na}`, s);
            if (s.rg_fv_graph_dbl) mapppedSections.set(`${s.rg_fv_graph_na}-${s.rg_fv_graph_nd}`, s);
        }

        const stops = (await stopsModel.find({ coords: { '$not': { '$elemMatch': { '$eq': Infinity } } } }).select({ _id: 1, coords: 1 }).lean().exec() as unknown as Stop[])
            .filter((s, _, arr) => !arr.find(ss => s.coords[0] === ss.coords[0] && s.coords[1] === ss.coords[1] && s._id !== ss._id));

        return {
            sections,
            mapppedSections,
            stops
        }

    }
    const b1 = await benchmark(queryData, [], 10);
    console.log("b1 ended")
    if (!b1.lastReturn) return console.log(`b1 return null`)
    const { sections, mapppedSections, stops } = b1.lastReturn;

    function makeGraph() {

        const footGraph: WeightedGraph = new WeightedGraph();

        for (const s of sections) {

            //Oriented
            s.rg_fv_graph_dbl ? footGraph.add_edge(s.rg_fv_graph_nd, s.rg_fv_graph_na, s.distance) : footGraph.add_arc(s.rg_fv_graph_nd, s.rg_fv_graph_na, s.distance);

        }

        return footGraph;
    }
    const b2 = await benchmark(makeGraph, [], 10);
    console.log("b2 ended")
    if (!b2.lastReturn) return console.log(`b2 return null`)
    const footGraph = b2.lastReturn;

    const arcs = footGraph.arcs;

    //Compute approached stops
    function ComputeApproachedStops() {

        //Pre-generate segments to fasten the process (and not redundant computing)
        //A segment describes a portion of a section (oriented)
        const segments: Map<Section, { n: number, seg: Segment }> = new Map();
        for (const a of arcs) {

            const section = mapppedSections.get(`${a[0]}-${a[1]}`);
            if (!section) continue // Added for ts mental health
            for (let i = 0; i < section.coords.length - 1; i++) {

                segments.set(section, {
                    n: i,
                    seg: new Segment(
                        new Point(...section.coords[i]),
                        new Point(...section.coords[i + 1])
                    )
                });

            }
        }

        /**@description [distance to closest point, closest point, section containing this point, indice of segment composing the section] */
        const approachedStops: Array<[Point, Section, number]> = new Array(stops.length);
        for (let i = 0; i < stops.length; i++) {

            let closestPoint: [number, Point | null, Section | null, number | null] = [Infinity, null, null, null];

            for (const [section, { n, seg }] of segments) {

                const stopPoint: Point = new Point(...stops[i].coords);
                const localClosestPoint: Point = seg.closestPointFromPoint(stopPoint);
                const distance: number = Point.distance(stopPoint, localClosestPoint);
                if (distance < closestPoint[0]) {
                    closestPoint[0] = distance;
                    closestPoint[1] = localClosestPoint;
                    closestPoint[2] = section;
                    closestPoint[3] = n;
                }
            }

            if (closestPoint[1] !== null && closestPoint[2] !== null && closestPoint[3] !== null) approachedStops[i] = [closestPoint[1], closestPoint[2], closestPoint[3]];

        }
        return approachedStops;
    }
    const b3 = await benchmark(ComputeApproachedStops, [], 2);
    console.log("b3 ended")
    if (!b3.lastReturn) return console.log(`b3 return null`)
    const approachedStops = b3.lastReturn;

    function updateGraph() {
        //Pushes new approached stops into graph, just like a proxy on a section
        for (let i = 0; i < approachedStops.length; i++) {

            if (!approachedStops[i]) continue; // couldn't find an approched stop (coords = Infinity)
            const [closestPoint, section, n] = approachedStops[i]

            //Compute distance from section start to approachedStop
            const toApproadchedStop: number = section.coords.reduce((acc, v, i, arr) => {
                if (i < n && i < arr.length - 1) return acc + cartographicDistance(...v, ...arr[i + 1]);
                return acc;
            }, 0) + Point.distance(closestPoint, new Point(...section.coords[n]));

            //Compute distance form approachedStop to section end
            const fromApproachedStop: number = section.coords.reduce((acc, v, i, arr) => {
                if (i > n && i < arr.length - 1) return acc + cartographicDistance(...v, ...arr[i + 1]);
                return acc;
            }, 0) + Point.distance(closestPoint, new Point(...section.coords[n]));

            //Remove arc from p1 to p2
            footGraph.remove_arc(section.rg_fv_graph_nd, section.rg_fv_graph_na);

            //Insert new node approachedStop
            //Create arc from p1 to approachedStop to p2
            //Ensure unique node id for approachedStop
            footGraph.add_arc(section.rg_fv_graph_nd, `stop-${stops[i]._id}`, toApproadchedStop);
            footGraph.add_arc(`stop-${stops[i]._id}`, section.rg_fv_graph_na, fromApproachedStop);

        }
    }
    const b4 = await benchmark(updateGraph, []);
    console.log("b4 ended")
    function computePaths() {

        return new Promise((res, rej) => {

            const workerPool = new WorkerPool<typeof initialCallback>(__dirname + '/computePath.js', 8, { adj: footGraph.adj, weights: footGraph.weights, stops });

            //paths<source, <target, paths>>
            const paths: Map<id, Awaited<ReturnType<typeof computePath>>> = new Map();

            for (let i = 0; i < stops.length; i++) {

                workerPool.run<typeof computePath>([`stop-${stops[i]._id}`]).then(sourcePaths => {

                    paths.set(stops[i]._id, sourcePaths);
                    if (paths.size === stops.length) res(paths);

                }).catch(rej);

            }
        })

    }
    const b5 = await benchmark(computePaths, []);
    console.log("b5 ended")
    const paths = b5.lastReturn;

    return { b1, b2, b3, b4, b5 };
}

run()
    .then(console.log)
    .catch(console.error)

setTimeout(() => { }, 1000000);