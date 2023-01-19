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
    })

  }
}

/**
 * @description Checks unicity of a value in an array
 */
export function unique<T>(v: T, i: number, arr: T[]): boolean {
  return arr.indexOf(v) === i;
}