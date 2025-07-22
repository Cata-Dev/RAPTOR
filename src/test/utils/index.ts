import { Ref } from "@typegoose/typegoose";
import { RefType } from "@typegoose/typegoose/lib/types";

type ResolveCb<T = void> = (value: T) => void;
type RejectCb = (reason?: unknown) => void;

class Deferred<T = unknown> {
  public promise: Promise<T>;
  public resolve!: ResolveCb<T>;
  public reject!: RejectCb;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

/**
 * @description Checks unicity of a value in an array
 */
function unique<T>(v: T, i: number, arr: T[]): boolean {
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
function binarySearch<T, C>(arr: T[], el: C, compare: (a: C, b: T) => number) {
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

function binaryFilter<T, C>(arr: T[], el: C, compare: (a: C, b: T) => number): T[] {
  const binarySearchResult = binarySearch(arr, el, compare);
  if (binarySearchResult < 0) return [];
  let low = binarySearchResult;
  while (low >= 0 && compare(el, arr[low]) === 0) {
    low--;
  }
  let high = binarySearchResult;
  while (high < arr.length && compare(el, arr[high]) === 0) {
    high++;
  }
  return arr.slice(low, high + 1);
}

async function mapAsync<I, O>(array: I[], callback: (value: I, index: number, array: I[]) => Promise<O>): Promise<O[]> {
  return await Promise.all(array.map(callback));
}

function wait(ms = 1000): Promise<unknown> {
  const defP = new Deferred();

  setTimeout(() => {
    defP.resolve(null);
  }, ms);

  return defP.promise;
}

type UnpackRefs<D, K extends keyof D> = Omit<D, K> & {
  [P in K]: D[P] extends Ref<infer T>
    ? T extends {
        _id?: RefType;
      }
      ? T["_id"]
      : never
    : D[P] extends Ref<infer T>[]
      ? T extends {
          _id?: RefType;
        }
        ? T["_id"][]
        : never
      : never;
};

export { Deferred, unique, binarySearch, binaryFilter, mapAsync, wait };
export type { ResolveCb, RejectCb, UnpackRefs };
