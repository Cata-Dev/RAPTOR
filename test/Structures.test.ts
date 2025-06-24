import { describe, expect, test } from "@jest/globals";
import { Route } from "../src/Structures";

describe("Route class", () => {
  const data: ConstructorParameters<typeof Route<number, number, number>> = [
    1,
    [1, 2, 3],
    [
      {
        id: 1,
        times: [
          [0, 1],
          [2, 3],
          [4, 5],
        ],
      },
      {
        id: 2,
        times: [
          [2, 4],
          [6, 8],
          [10, 12],
        ],
      },
    ],
  ];

  test("Basic props", () => {
    const route = new Route(...data);

    expect(route.id).toBe(data[0]);
    expect(route.stops.reduce((acc, s, i) => acc && s === data[1].at(i), true)).toBe(true);
    expect(route.trips.reduce((acc, t, i) => acc && t === data[2].at(i), true)).toBe(true);
  });

  test("departureTime", () => {
    const route = new Route(...data);

    expect(route.departureTime(0, 0)).toBe(1);
    expect(route.departureTime(0, 2)).toBe(5);
    expect(route.departureTime(1, 0)).toBe(4);
    expect(route.departureTime(1, 2)).toBe(12);
  });
});
