import Vector2 from "./Vector";

export default class Point {

    x: number;
    y: number;

    constructor(x: number, y: number) {

        this.x = x;
        this.y = y;

    }

    transform(v: Vector2): Point {

        this.x += v.x;
        this.y += v.y;
        return this

    }

    static transform(p: Point, v: Vector2): Point {

        return new Point(p.x+v.x, p.y+v.y);

    }

    static distance(p1: Point, p2: Point): number {

        return Math.sqrt((p2.x-p1.x)**2+(p2.y-p1.y)**2)

    }

}