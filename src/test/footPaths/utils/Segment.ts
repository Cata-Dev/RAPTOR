import Point from "./Point";
import Vector2 from "./Vector";

export default class Segment {
  protected AB: Vector2;

  constructor(
    protected A: Point,
    protected B: Point,
  ) {
    this.AB = new Vector2(A, B);
  }

  get length() {
    return new Vector2(this.A, this.B).length;
  }

  orthogonalProjection(C: Point): Point {
    const AC = new Vector2(this.A, C);
    const AB = new Vector2(this.A, this.B);

    const coeff = Vector2.dot(AC, AB) / AB.magnitude;
    const AH = AB.mult(coeff);

    return new Point(AH.x + this.A.x, AH.y + this.A.y);
  }

  /**
   * @description It's basically an orthogonal projection
   */
  closestPointFromPoint(P: Point): Point {
    const AP: Vector2 = new Vector2(this.A, P);

    const ABAP = Vector2.dot(AP, this.AB);
    const magnitudeAB: number = this.AB.magnitude;
    const distance: number = ABAP / magnitudeAB;

    if (distance < 0) {
      return this.A;
    } else if (distance > 1) {
      return this.B;
    } else {
      return Point.transform(this.A, Vector2.mult(this.AB, distance));
    }
  }
}
