import { Ref } from "@typegoose/typegoose";
import { RefType } from "@typegoose/typegoose/lib/types";
import { node } from "@catatomik/dijkstra/lib/utils/Graph";

export function euclidianDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export type unpackRefType<T> = T extends Ref<infer D>
  ? D extends {
      _id?: RefType;
    }
    ? D["_id"]
    : never
  : T extends Ref<infer D>[]
  ? D extends {
      _id?: RefType;
    }
    ? D["_id"][]
    : never
  : never;

/** Ensure unique node id for approachedStop (as(approached stop)={stop id}) */
export function approachedStopName(_id: number) {
  return `as=${_id}` as const;
}

export function dbIntersectionId(_id: number) {
  return `i=${_id}` as const;
}

export function dbSectionId(_id: number) {
  return `s=${_id}` as const;
}

export function sectionId<S extends { rg_fv_graph_nd: node; rg_fv_graph_na: node }>({ rg_fv_graph_nd, rg_fv_graph_na }: S) {
  return `${rg_fv_graph_nd}-${rg_fv_graph_na}` as const;
}