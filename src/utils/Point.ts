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

}