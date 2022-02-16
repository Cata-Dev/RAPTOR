import Point from './Point'

export type direction = 0 | 1

export default class Vector2 {

    x: number;
    y: number;

    /**
     * @description Create a new vector from 2 points
     * @param e1 Origin
     * @param e2 Destination
     */
    constructor(e1: Point, e2: Point) {
        
        this.x = e2.x - e1.x;
        this.y = e2.y - e1.y;

    }

    /**
     * @description Squared length
     */
    get magnitude(): number {

        return this.x**2+this.y**2;

    }

    get length(): number {

        return Math.sqrt(this.magnitude);

    }

    mult(k: number): Vector2 {

        this.x *= k;
        this.y *= k;
        return this;

    }

    static dot(v1: Vector2, v2: Vector2): number {

        return v1.x*v2.x+v1.y*v2.y;

    }

}