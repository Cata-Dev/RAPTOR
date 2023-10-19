import Vector2 from "./Vector";

const X0 = 700000;
const Y0 = 6600000;
const a = 6378137;
const e = 0.08181919106;
const l0 = (Math.PI / 180) * 3;
const lc = l0;
const phi0 = (Math.PI / 180) * 46.5;
const phi1 = (Math.PI / 180) * 44;
const phi2 = (Math.PI / 180) * 49;

const gN1 = a / Math.sqrt(1 - e * e * Math.sin(phi1) * Math.sin(phi1));
const gN2 = a / Math.sqrt(1 - e * e * Math.sin(phi2) * Math.sin(phi2));

const gl0 = Math.log(Math.tan(Math.PI / 4 + phi0 / 2) * Math.pow((1 - e * Math.sin(phi0)) / (1 + e * Math.sin(phi0)), e / 2));
const gl1 = Math.log(Math.tan(Math.PI / 4 + phi1 / 2) * Math.pow((1 - e * Math.sin(phi1)) / (1 + e * Math.sin(phi1)), e / 2));
const gl2 = Math.log(Math.tan(Math.PI / 4 + phi2 / 2) * Math.pow((1 - e * Math.sin(phi2)) / (1 + e * Math.sin(phi2)), e / 2));

const n = Math.log((gN2 * Math.cos(phi2)) / (gN1 * Math.cos(phi1))) / (gl1 - gl2);
const c = ((gN1 * Math.cos(phi1)) / n) * Math.exp(n * gl1);

export default class Point {
  constructor(
    protected _x: number,
    protected _y: number,
  ) {}

  public get x() {
    return this._x;
  }

  public get y() {
    return this._y;
  }

  transform(v: Vector2) {
    this._x += v.x;
    this._y += v.y;
    return this;
  }

  static transform(p: Point, v: Vector2): Point {
    return new Point(p.x + v.x, p.y + v.y);
  }

  distance(p: Point) {
    return Math.sqrt((p.x - this.x) ** 2 + (p.y - this.y) ** 2);
  }

  static distance(p1: Point, p2: Point): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  fromWGSToLambert93() {
    const { x, y } = Point.fromWGSToLambert93(this);
    this._x = x;
    this._y = y;
    return this;
  }

  /**
   * @description Converts WGS coordinates into Lambert 93 coordinates. X is latitude, Y is longitude.
   */
  static fromWGSToLambert93 = ({ x, y }: Point): Point => {
    const phi = (Math.PI / 180) * x;
    const l = (Math.PI / 180) * y;

    const gl = Math.log(Math.tan(Math.PI / 4 + phi / 2) * Math.pow((1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi)), e / 2));

    const ys = Y0 + c * Math.exp(-1 * n * gl0);

    return new Point(X0 + c * Math.exp(-1 * n * gl) * Math.sin(n * (l - lc)), ys - c * Math.exp(-1 * n * gl) * Math.cos(n * (l - lc)));
  };
}
