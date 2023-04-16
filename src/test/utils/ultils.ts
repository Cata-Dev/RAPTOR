import { Ref } from "@typegoose/typegoose";
import { RefType } from "@typegoose/typegoose/lib/types";
import { node } from "../../utils/Graph";

export type resolveCb<T = void> = (value: T) => void;
export type rejectCb = (reason?: any) => void;

export class Deferred<T = unknown> {
  public promise: Promise<T>;
  public resolve!: resolveCb<T>;
  public reject!: rejectCb;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

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

/**
 * @description Checks unicity of a value in an array
 */
export function unique<T>(v: T, i: number, arr: T[]): boolean {
  return arr.indexOf(v) === i;
}

/**
 * @description Search for a value in a **sorted** array, in O(log2(n)).
 * @param arr The **sorted** array where performing the search
 * @param el The element to look for, which will be compared
 * @param compare A compare function that takes 2 arguments : `a` el and `b` an element of the array.
 * It returns :
 *    - a negative number if `a` is before `b`;
 *    - 0 if `a` is equal to `b`;
 *    - a positive number of `a` is after `b`.
 * @returns The index of el if positive ; index of insertion if negative
 */
export function binarySearch<T, C>(arr: T[], el: C, compare: (a: C, b: T) => number) {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = (high + low) >> 1; // x >> 1 == Math.floor(x/2)
    const cmp = compare(el, arr[mid]);
    if (cmp > 0) {
      low = mid + 1;
    } else if (cmp < 0) {
      high = mid - 1;
    } else {
      return mid;
    }
  }
  return ~low; // ~x == -x-1
}

export function binaryFilter<T, C>(arr: T[], el: C, compare: (a: C, b: T) => number): T[] {
  const binarySearchResult = binarySearch(arr, el, compare);
  if (binarySearchResult < 0) return [];
  let low = binarySearchResult;
  while (compare(el, arr[low]) === 0) {
    low--;
  }
  let high = binarySearchResult;
  while (compare(el, arr[high]) === 0) {
    high--;
  }
  return arr.slice(low, high + 1);
}
