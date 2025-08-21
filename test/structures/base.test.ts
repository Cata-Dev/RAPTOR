import { describe, expect, test, jest } from "@jest/globals";
import { Bag, Criterion, Label, Route, TimeInt, TimeScal } from "../../src";
import { setLabelValues } from "./utils";

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

const c1Update = jest.fn<Criterion<number, number, number, number, "c1">["update"]>((prefixJourney, newJourneyStep, timeType, time, stop) => stop);
const c1: Criterion<number, number, number, number, "c1"> = {
  name: "c1",
  initialValue: Infinity,
  order: TimeScal.strict.order,
  update: c1Update,
};
const c2Update = jest.fn<Criterion<number, number, number, number, "c2">["update"]>(
  (prefixJourney, newJourneyStep, timeType, time, stop) => time + stop,
);
const c2: Criterion<number, number, number, number, "c2"> = {
  name: "c2",
  initialValue: -Infinity,
  order: TimeScal.strict.order,
  update: c2Update,
};
describe("Label class", () => {
  describe("Without criterion", () => {
    describe("Scalar time", () => {
      const l = new Label(TimeScal, [], 0);
      const l1 = new Label(TimeScal, [], 3);

      test("Basic getters", () => {
        expect(l.time).toBe(0);
        expect(l1.time).toBe(3);
      });

      test("Comparison", () => {
        expect(l.compare(l1)).toBe(1);
        expect(l1.compare(l)).toBe(-1);
        expect(l1.compare(new Label(TimeScal, [], 3))).toBe(0);
      });

      test("Update", () => {
        const lUpdated = l.update(5, [[], {}, TimeScal, 5, 0]);
        expect(lUpdated).not.toBe(l);
        expect(lUpdated.time).toBe(5);
      });
    });

    describe("Interval time", () => {
      const l = new Label(TimeInt, [], [-3, -1]);
      const l1 = new Label(TimeInt, [], [-2, 0]);
      const l2 = new Label(TimeInt, [], [2, 4]);
      const l3 = new Label(TimeInt, [], [-2, -1.5]);

      test("Basic getters", () => {
        expect(l.time).toEqual([-3, -1]);
        expect(l2.time).toEqual([2, 4]);
      });

      test("Comparison", () => {
        expect(l.compare(l1)).toBe(null);
        expect(l1.compare(l)).toBe(null);
        expect(l.compare(l2)).toBe(1);
        expect(l2.compare(l)).toBe(-1);
        expect(l.compare(l)).toBe(0);
        // Included
        expect(l.compare(l3)).toBe(null);
        expect(l3.compare(l)).toBe(null);
      });

      test("Update", () => {
        const lUpdated = l.update([-4, -2], [[], {}, TimeInt, [-4, -2], 0]);
        expect(lUpdated).not.toBe(l);
        expect(lUpdated.time).toEqual([-4, -2]);
      });
    });
  });

  describe("With criterion", () => {
    const l = new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 0);
    const l1 = setLabelValues(new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 3), [4, 5]);

    test("Basic getters", () => {
      expect(l.time).toBe(0);
      expect(l1.time).toBe(3);

      expect(l.value("c1")).toBe(Infinity);
      expect(l.value("c2")).toBe(-Infinity);

      expect(l1.value("c1")).toBe(4);
      expect(l1.value("c2")).toBe(5);
    });

    test("Comparison", () => {
      expect(l.compare(l1)).toBe(null);
      expect(l1.compare(l)).toBe(null);
      expect(
        l1.compare(setLabelValues(new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 3), [4, 5])),
      ).toBe(0);
      expect(
        l1.compare(setLabelValues(new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 4), [5, 6])),
      ).toBe(1);
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
              label: l as unknown as Label<number, number, number, number, [[number, "c1" | "c2"]]>,
              compare: () => 0,
            },
          ],
          {},
          TimeScal,
          5,
          3,
        ],
      ];
      const lUpdated = l.update(...lUpdateArgs);
      expect(c1Update).toHaveBeenCalledTimes(1);
      expect(c1Update).toHaveBeenLastCalledWith(...(lUpdateArgs[1] as Parameters<typeof c1Update>));
      expect(c2Update).toHaveBeenCalledTimes(1);
      expect(c2Update).toHaveBeenLastCalledWith(...(lUpdateArgs[1] as Parameters<typeof c2Update>));
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
              label: l as unknown as Label<number, number, number, number, [[number, "c1" | "c2"]]>,
              compare: () => 0,
            },
          ],
          {},
          TimeScal,
          2,
          1,
        ],
      ];
      const l1Updated = l1.update(...l1UpdateArgs);
      expect(c1Update).toHaveBeenCalledTimes(2);
      expect(c1Update).toHaveBeenLastCalledWith(...(l1UpdateArgs[1] as Parameters<typeof c1Update>));
      expect(c2Update).toHaveBeenCalledTimes(2);
      expect(c2Update).toHaveBeenLastCalledWith(...(l1UpdateArgs[1] as Parameters<typeof c2Update>));
      expect(l1Updated).not.toBe(l1);
      expect(l1Updated.time).toBe(10);
      expect(l1Updated.value("c1")).toBe(1);
      expect(l1Updated.value("c2")).toBe(3);
    });

    test("setValue", () => {
      const l = new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 0);

      const lUpdatedc1 = l.setValue("c1", 3);
      expect(lUpdatedc1.value("c1")).toBe(3);
      expect(lUpdatedc1.value("c2")).toBe(c2.initialValue);

      const lUpdatedc2 = lUpdatedc1.setValue("c2", 5);
      expect(lUpdatedc2.value("c1")).toBe(3);
      expect(lUpdatedc2.value("c2")).toBe(5);
    });
  });
});

c1Update.mockClear();
c2Update.mockClear();
describe("Bag class", () => {
  test("Scenario", () => {
    const l = new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 0);
    const l1 = setLabelValues(new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 3), [4, 5]);
    const l2 = setLabelValues(new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 3), [4, 3]);
    const l3 = setLabelValues(new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 3), [4, 2]);
    const l4 = setLabelValues(new Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>(TimeScal, [c1, c2], 2), [4, 6]);

    const b = new Bag<Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>>();
    let { added, pruned } = b.add(l);
    expect(added).toBe(true);
    expect(pruned).toBe(0);
    expect(b.size).toBe(1);
    for (const label of b) expect(label).toBe(l);

    ({ added, pruned } = b.add(l1));
    expect(added).toBe(true);
    expect(pruned).toBe(0);
    expect(b.size).toBe(2);
    expect(b.values()).toContain(l);
    expect(b.values()).toContain(l1);

    added = b.addOnly(l2);
    expect(added).toBe(true);
    expect((b as unknown as { inner: [] }).inner.length).toBe(3);
    expect(b.size).toBe(2);
    expect(b.values()).toContain(l);
    expect(b.values()).toContain(l2);
    expect(b.values()).not.toContain(l1);

    pruned = b.prune();
    expect(pruned).toBe(1);
    expect((b as unknown as { inner: [] }).inner.length).toBe(2);

    ({ added, pruned } = b.add(l1));
    expect(added).toBe(false);
    expect(pruned).toBe(0);
    expect(b.size).toBe(2);
    expect(b.values()).toContain(l);
    expect(b.values()).toContain(l2);

    const b1 = new Bag<Label<number, number, number, number, [[number, "c1"], [number, "c2"]]>>();
    b1.add(l);
    b1.add(l1);
    b1.add(l2);
    b1.add(l4);
    expect(b1.size).toBe(3);
    expect(b1.values()).toContain(l);
    expect(b1.values()).toContain(l2);
    expect(b1.values()).toContain(l4);

    // Update
    pruned = b1.update(l, l3);
    expect(pruned).toBe(1);
    expect(b1.size).toBe(2);
    expect(b1.values()).toContain(l3);
    expect(b1.values()).toContain(l4);
    // Update missing
    pruned = b1.update(l1, l);
    expect(pruned).toBe(0);
    expect(b1.size).toBe(2);
    expect(b1.values()).toContain(l3);
    expect(b1.values()).toContain(l4);
    // Update with dominated
    ({ added, pruned } = b1.add(l));
    expect(added).toBe(true);
    expect(pruned).toBe(0);
    expect(b1.size).toBe(3);
    expect(b1.values()).toContain(l);
    pruned = b1.update(l, l2);
    expect(pruned).toBe(1);
    expect(b1.size).toBe(2);
    expect(b1.values()).toContain(l3);
    expect(b1.values()).toContain(l4);

    let addedCount: number;
    // eslint-disable-next-line prefer-const
    ({ added: addedCount, pruned } = b.merge(b1));
    expect(addedCount).toBe(2);
    expect(pruned).toBe(1);
    expect(b.size).toBe(3);
    expect(b.values()).toContain(l);
    expect(b.values()).toContain(l3);
    expect(b.values()).toContain(l4);

    // Side effects check
    expect(b1.size).toBe(2);
    expect(b1.values()).toContain(l3);
    expect(b1.values()).toContain(l4);
  });
});
