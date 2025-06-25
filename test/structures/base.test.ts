import { describe, expect, test, jest } from "@jest/globals";
import { Criterion, Label, Route } from "../../src/main";

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
    expect(() => route.departureTime(2, 0)).toThrow("No departure time");
    expect(() => route.departureTime(10, 3)).toThrow("No departure time");
    expect(() => route.departureTime(0, 3)).toThrow("No departure time");
    expect(() => route.departureTime(0, 10)).toThrow("No departure time");
  });
});

describe("Label class", () => {
  describe("Without criterion", () => {
    const l = new Label([], 0);
    const l1 = new Label([], 3);

    test("Basic getters", () => {
      expect(l.time).toBe(0);
      expect(l1.time).toBe(3);
    });

    test("Comparison", () => {
      expect(l.compare(l1)).toBe(1);
      expect(l1.compare(l)).toBe(-1);
      expect(l1.compare(new Label([], 3))).toBe(0);
    });

    test("Update", () => {
      const lUpdated = l.update(5, [[], {}, 5, 0]);
      expect(lUpdated).not.toBe(l);
      expect(lUpdated.time).toBe(5);
    });
  });

  describe("With criterion", () => {
    const c1Update = jest.fn<Criterion<number, number, ["c1", "c2"]>["update"]>((prefixJourney, newJourneyStep, time, stop) => stop);
    const c1: Criterion<number, number, ["c1", "c2"]> = {
      name: "c1",
      update: c1Update,
    };
    const c2Update = jest.fn<Criterion<number, number, ["c1", "c2"]>["update"]>((prefixJourney, newJourneyStep, time, stop) => time + stop);
    const c2: Criterion<number, number, ["c1", "c2"]> = {
      name: "c2",
      update: c2Update,
    };

    const l = new Label<number, number, ["c1", "c2"]>([c1, c2], 0);
    const l1 = new Label<number, number, ["c1", "c2"]>([c1, c2], 3, [4, 5]);

    test("Basic getters", () => {
      expect(l.time).toBe(0);
      expect(l1.time).toBe(3);

      expect(l.value("c1")).toBe(Infinity);
      expect(l.value("c2")).toBe(Infinity);

      expect(l1.value("c1")).toBe(4);
      expect(l1.value("c2")).toBe(5);
    });

    test("Comparison", () => {
      expect(l.compare(l1)).toBe(null);
      expect(l1.compare(l)).toBe(null);
      expect(l1.compare(new Label<number, number, ["c1", "c2"]>([c1, c2], 3, [4, 5]))).toBe(0);
      expect(l1.compare(new Label<number, number, ["c1", "c2"]>([c1, c2], 4, [5, 6]))).toBe(1);
    });

    expect(c1Update).not.toHaveBeenCalled();
    expect(c2Update).not.toHaveBeenCalled();

    test("Update", () => {
      const lUpdateArgs: Parameters<(typeof l)["update"]> = [
        5,
        [
          [
            {
              boardedAt: 4,
              transfer: { to: 5, length: 6 },
              label: l,
              compare: () => 0,
            },
          ],
          {},
          5,
          3,
        ],
      ];
      const lUpdated = l.update(...lUpdateArgs);
      expect(c1Update).toHaveBeenCalledTimes(1);
      expect(c1Update).toHaveBeenLastCalledWith(...lUpdateArgs[1]);
      expect(c2Update).toHaveBeenCalledTimes(1);
      expect(c2Update).toHaveBeenLastCalledWith(...lUpdateArgs[1]);
      expect(lUpdated).not.toBe(l);
      expect(lUpdated.time).toBe(5);
      expect(lUpdated.value("c1")).toBe(3);
      expect(lUpdated.value("c2")).toBe(8);

      const l1UpdateArgs: Parameters<(typeof l1)["update"]> = [
        10,
        [
          [
            {
              boardedAt: 4,
              transfer: { to: 5, length: 6 },
              label: l,
              compare: () => 0,
            },
          ],
          {},
          2,
          1,
        ],
      ];
      const l1Updated = l1.update(...l1UpdateArgs);
      expect(c1Update).toHaveBeenCalledTimes(2);
      expect(c1Update).toHaveBeenLastCalledWith(...l1UpdateArgs[1]);
      expect(c2Update).toHaveBeenCalledTimes(2);
      expect(c2Update).toHaveBeenLastCalledWith(...l1UpdateArgs[1]);
      expect(l1Updated).not.toBe(l1);
      expect(l1Updated.time).toBe(10);
      expect(l1Updated.value("c1")).toBe(1);
      expect(l1Updated.value("c2")).toBe(3);
    });
  });
});
