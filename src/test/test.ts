import { Schema, model, Model } from 'mongoose';
import db from './utils/mongoose';
import { benchmark } from './utils/benchmark';
import { WorkerPool } from './utils/Workers';

import { WeightedGraph } from '../utils/Graph';
import { path } from '../FootPaths';

import Point from '../utils/Point';
import Segment from '../utils/Segment';

export type id = number;

export interface section {
    _id: id;
    createdAt: Date;
    updatedAt: Date;
    coords: Array<[number, number]>;
    distance: number;
    domanial: number;
    groupe: number;
    nom_voie: string;
    rg_fv_graph_dbl: boolean;
    rg_fv_graph_na: id;
    rg_fv_graph_nd: id;
}

export interface stop {
    _id: id;
    createdAt: Date;
    updatedAt: Date;
    coords: [number, number];
    actif: 0 | 1;
    libelle: string;
    libelle_lowercase: string;
    type: string;
    vehicule: "BUS" | "TRAM" | "BATEAU";
}

function cartographicDistance(x1: number, y1: number, x2: number, y2: number): number {

    return Math.sqrt((x2-x1)**2+(y2-y1)**2);

}

async function run() {

    //Grab required data
    await db();

    const sectionsModel: Model<section> = require('./models/sections.model')(Schema, model);
    const stopsModel: Model<stop> = require('./models/TBM_Stops.model')(Schema, model);

    async function queryData() {

        //Important : sections are oriented.
        //ERROR : there can be 2 sections (or more) linking the same nd to the same na. They need to be both differentiated (by their _id, for example).
        const sections: Array<section> = await sectionsModel.find({}).lean().exec();
        //Map section, from s1 to s2 (oriented).
        const sectionsMap: Map<string, section> = new Map();
        for (const s of sections) {
            sectionsMap.set(`${s.rg_fv_graph_nd}-${s.rg_fv_graph_na}`, s);
            if (s.rg_fv_graph_dbl) sectionsMap.set(`${s.rg_fv_graph_na}-${s.rg_fv_graph_nd}`, s);
        }

        const stops: Array<stop> = await stopsModel.find({ coords: { '$not': { '$elemMatch': { '$eq': NaN } } } }).lean().exec();

        return {
            sections,
            sectionsMap,
            stops
        }

    }
    const b1 = await benchmark(queryData, [], 10);
    const { sections, sectionsMap, stops } = b1.lastReturn;

    function makeGraph() {

        const footGraph: WeightedGraph = new WeightedGraph();

        for (const s of sections) {

            //Oriented
            s.rg_fv_graph_dbl ? footGraph.add_edge(s.rg_fv_graph_nd, s.rg_fv_graph_na, s.distance) : footGraph.add_arc(s.rg_fv_graph_nd, s.rg_fv_graph_na, s.distance);

        }
        
        return footGraph;
    }
    const b2 = await benchmark(makeGraph, [], 10);
    const footGraph = b2.lastReturn;

    const arcs = footGraph.arcs;

    //Compute approached stops
    function ComputeApproachedStops() {

        //Pre-generate segments to fasten the process (and not redundant computing)
        //A segment describes a portion of a section (oriented)
        const segments: Map<section, { n: number, seg: Segment }> = new Map();
        for (const a of arcs) {

            const section: section = sectionsMap.get(`${a[0]}-${a[1]}`);
            for (let i = 0; i < section.coords.length-1; i++) {

                segments.set(section, {
                    n: i,
                    seg: new Segment(
                        new Point(...section.coords[i]),
                        new Point(...section.coords[i+1])
                    )
                });

            }
        }

        const approachedStops: Array<[Point, section, number]> = new Array(stops.length);
        for (let i = 0; i < stops.length; i++) {
            
            let closestPoint: [number, Point, section, number] = [Infinity, null, null, null];

                for (const [ section, { n, seg } ] of segments) {

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

            approachedStops[i] = [closestPoint[1], closestPoint[2], closestPoint[3]];

        }
        return approachedStops;
    }
    const b3 = await benchmark(ComputeApproachedStops, [], 1);
    const approachedStops = b3.lastReturn;

    function updateGraph() {
        //Pushes new approached stops into graph, just like a proxy on a section
        for (let i = 0; i < approachedStops.length; i++) {

            const [closestPoint, section, n] = approachedStops[i]

            //Compute distance from section start to approachedStop
            const toApproadchedStop: number = section.coords.reduce((acc, v, i, arr) => {
                if (i < n && i < arr.length - 1) return acc+cartographicDistance(...v, ...arr[i+1]);
                return acc;
            }, 0) + Point.distance(closestPoint, new Point(...section.coords[n]));

            //Compute distance form approachedStop to section end
            const fromApproachedStop: number = section.coords.reduce((acc, v, i, arr) => {
                if (i > n && i < arr.length - 1) return acc+cartographicDistance(...v, ...arr[i+1]);
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
    function computePaths() {

        return new Promise((res, rej) => {

        const workerPool = new WorkerPool(__dirname+'/computePath.js', 8, { adj: footGraph.adj, weights: footGraph.weights, stops });

        //paths<source, <target, paths>>
        const paths: Map<id, Map<id, path>> = new Map();

        for (let i = 0; i < stops.length; i ++) {

            workerPool.run<Map<id, path>>(i).then(sourcePaths => {

                paths.set(stops[i]._id, sourcePaths);
                if (paths.size === stops.length) res(paths);

            }).catch(rej);

        }
    })

    }
    const b5 = await benchmark(computePaths, []);
    const paths = b5.lastReturn;

    return { b1, b2, b3, b4, b5 };
}

run()
    .then(console.log)
    .catch(console.error)

setTimeout(() => {}, 1000000);