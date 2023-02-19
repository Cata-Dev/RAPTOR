const emptyLink = Symbol("emptyLink");

export type LinkOrEmpty<T = unknown> = Link<T> | typeof emptyLink;

/**
 * @description Class of chained array
 */
export class Link<Type> {
  static emptyLink: typeof emptyLink = emptyLink;

  private _value: Type;
  private _next: LinkOrEmpty;

  /**
   * @description Construction of the first LinkOrEmpty
   * @param val Any type of data to LinkOrEmpty
   */
  constructor(val: Type, next: LinkOrEmpty = Link.emptyLink) {
    this._value = val;
    this._next = next;
  }

  static isLink(l: LinkOrEmpty): boolean {
    return l instanceof Link;
  }

  /**
   * @description Get the value of this LinkOrEmpty
   */
  get value(): Type {
    return this._value;
  }

  set value(v: any) {
    this._value = v;
  }

  /**
   * @description Get the next LinkOrEmpty of this chained array
   */
  get next(): LinkOrEmpty {
    return this._next;
  }

  set next(v: LinkOrEmpty) {
    if (!Link.isLink(v) && v != Link.emptyLink) throw new Error("Next value of the LinkOrEmpty can only be a Link or an empty Link.");
    this._next = v;
  }

  /**
   * @description Get depth of the LinkOrEmpty {Number}
   */
  get depth(): number {
    if (!Link.isLink(this._next)) return 1;
    return 1 + (this._next as Link<any>).depth;
  }

  toArrayRec(): any[] {
    if (!Link.isLink(this.next)) return [this.value];
    let next = (this.next as Link<any>).toArrayRec();
    return [this.value, ...next];
  }

  toArray(): any[] {
    return Array.from(this);
  }

  toArrayRevertedRec(): any[] {
    if (!this._next || !(this._next instanceof Link)) return [this.value];
    let next = this._next.toArray();
    return [...next, this.value];
  }

  toArrayReverted(): any[] {
    return this.toArray().reverse();
  }

  *[Symbol.iterator]() {
    let el = this as Link<any>;
    while (Link.isLink(el)) {
      yield el.value;
      el = el._next as Link<any>;
    }
  }

  /**
   * @description Get the n(th) element of the LinkOrEmpty
   * @param {Number} n Index of the element to access to
   */
  get_rec(n: number): any {
    if (n < 0) throw new Error("Invalid index");
    if (n == 0) return this.value;
    if (this._next instanceof Link) return this._next.get(n - 1);
    else throw new Error("Index out of range");
  }

  /**
   * @description Get the n(th) element of the LinkOrEmpty
   * @param {Number} n Index of the element to access to
   */
  get(n: number): any {
    if (n < 0) throw new Error("Invalid index");
    let i = 0;
    for (let el of this) {
      if (n === i) return el;
      i++;
    }
    throw new Error("Index out of range");
  }

  /**
   * @description Create chained array from array
   * @param {Array} a The array to convert into chained array
   */
  static fromArray<T extends unknown>(a: Array<T> = []): LinkOrEmpty<T> {
    let m: LinkOrEmpty<T> = Link.emptyLink;
    for (let i = a.length - 1; i >= 0; i--) {
      m = new this(a[i], m);
    }
    return m;
  }
}
