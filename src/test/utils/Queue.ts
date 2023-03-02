import { LinkOrEmpty, Link } from "./Link";

export class Queue<Type> {
  private front: LinkOrEmpty;
  private back: LinkOrEmpty;
  private _size: number;

  constructor() {
    this.front = Link.emptyLink;
    this.back = Link.emptyLink;
    this._size = 0;
  }

  get size(): number {
    return this._size;
  }

  enqueue(val: Type): Queue<Type> {
    if (this.size === 0) {
      this.front = new Link<Type>(val);
      this.back = this.front;
    } else {
      (this.back as Link<Type>).next = new Link<Type>(val);
      this.back = (this.back as Link<Type>).next;
    }
    this._size++;
    return this;
  }

  dequeue(): Type {
    if (!this.size) throw new Error("Queue is empty.");
    const v = (this.front as Link<Type>).value;
    this.front = (this.front as Link<Type>).next;
    this._size--;
    return v;
  }

  toArray(): Type[] {
    if (!this.size) return [];
    return (this.front as Link<Type>).toArray();
  }
}

export type unpackQueue<Q> = Q extends Queue<infer T> ? T : never;
