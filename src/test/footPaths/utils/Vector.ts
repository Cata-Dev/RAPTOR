import Point from "./Point";

export type direction = 0 | 1;

export default class Vector2 {
  x = NaN;
  y = NaN;

  /**
   * @description Create a new vector from 2 points
   * @param e1 Origin
   * @param e2 Destination
   */
  constructor(e1: Point, e2: Point);
  constructor(x: number, y: number);
  constructor(xe1: Point | number, ye2: Point | number) {
    if (xe1 instanceof Point && ye2 instanceof Point) {
      this.x = ye2.x - xe1.x;
      this.y = ye2.y - xe1.y;
    } else if (typeof xe1 === "number" && typeof ye2 === "number") {
      this.x = xe1;
      this.y = ye2;
    }
  }

  /**
   * @description Squared length
   */
  get magnitude(): number {
    return this.x ** 2 + this.y ** 2;
  }

  get length(): number {
    return Math.sqrt(this.magnitude);
  }

  mult(k: number): Vector2 {
    this.x *= k;
    this.y *= k;
    return this;
  }

  static mult(v: Vector2, k: number): Vector2 {
    return new Vector2(v.x * k, v.y * k);
  }

  static dot(v1: Vector2, v2: Vector2): number {
    return v1.x * v2.x + v1.y * v2.y;
  }
}
