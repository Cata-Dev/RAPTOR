export type resolveCb<T = void> = (value: T) => void;
export type rejectCb = (reason?: unknown) => void;

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
  while (low >= 0 && compare(el, arr[low]) === 0) {
    low--;
  }
  let high = binarySearchResult;
  while (high < arr.length && compare(el, arr[high]) === 0) {
    high++;
  }
  return arr.slice(low, high + 1);
}

export async function mapAsync<I, O>(array: I[], callback: (value: I, index: number, array: I[]) => Promise<O>): Promise<O[]> {
  return await Promise.all(array.map(callback));
}

export function wait(ms = 1000): Promise<unknown> {
  const defP = new Deferred();

  setTimeout(() => {
    defP.resolve(null);
  }, ms);

  return defP.promise;
}