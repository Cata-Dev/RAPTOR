/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "@jest/globals";
import { RAPTOR, RAPTORData } from "../src/main";
import oneLine from "./assets/oneLine";
import twoLines from "./assets/twoLines";

const MAX_ROUNDS = 6;

describe("One line", () => {
  const pt = 4;

  describe("withoutTransfers", () => {
    const dataset = oneLine.withoutTransfers;
    const raptorData = new RAPTORData(...dataset);
    const raptorInstance = new RAPTOR(raptorData);

    raptorInstance.run(dataset[0].at(0)!.id, pt, 0, { walkSpeed: 1 }, MAX_ROUNDS);

    const res = raptorInstance.getBestJourneys(pt);
    test("Run result is exact", () => {
      expect(res[0]).toBe(null);
      for (let i = 3; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
      for (const i of [1, 2]) {
        expect(res[i]!.length).toBe(2);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(0);

        expect(Object.keys(res[i]![1]).length).toEqual(5);
        expect(res[i]![1].label.time).toBe(6);

        const js1 = res[i]![1];
        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(0);
      }
    });
  });

  describe("withSlowTransfers", () => {
    const dataset = oneLine.withSlowTransfers;
    const raptorData = new RAPTORData(...dataset);
    const raptorInstance = new RAPTOR(raptorData);

    raptorInstance.run(dataset[0].at(0)!.id, pt, 0, { walkSpeed: 1 }, MAX_ROUNDS);

    const res = raptorInstance.getBestJourneys(pt);
    test("Run result is exact", () => {
      expect(res[0]).toBe(null);
      for (let i = 3; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
      for (const i of [1, 2]) {
        expect(res[i]!.length).toBe(2);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(0);

        expect(Object.keys(res[i]![1]).length).toEqual(5);
        expect(res[i]![1].label.time).toBe(6);

        const js1 = res[i]![1];
        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(0);
      }
    });
  });

  describe("withFastTransfers", () => {
    const dataset = oneLine.withFastTransfers;
    const raptorData = new RAPTORData(...dataset);
    const raptorInstance = new RAPTOR(raptorData);

    raptorInstance.run(dataset[0].at(0)!.id, pt, 0, { walkSpeed: 1 }, MAX_ROUNDS);

    const res = raptorInstance.getBestJourneys(pt);
    test("Run result is exact", () => {
      expect(res[0]).toBe(null);
      for (let i = 3; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
      for (const i of [1, 2]) {
        expect(res[i]!.length).toBe(3);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(0);

        const js1 = res[i]![1];
        expect(Object.keys(js1).length).toEqual(5);
        expect(js1.label.time).toBe(4);

        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(0);

        const js2 = res[i]![2];
        expect(Object.keys(js2).length).toEqual(4);
        expect(js2.label.time).toBe(5);

        if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

        expect(js2.boardedAt).toBe(3);
        expect(js2.transfer.to).toBe(4);
        expect(js2.transfer.length).toBe(1);
      }
    });
  });

  describe("late departure, slow transfers", () => {
    const dataset = oneLine.withSlowTransfers;
    const raptorData = new RAPTORData(...dataset);
    const raptorInstance = new RAPTOR(raptorData);

    raptorInstance.run(dataset[0].at(0)!.id, pt, 4, { walkSpeed: 1 }, MAX_ROUNDS);

    const res = raptorInstance.getBestJourneys(pt);
    test("Run result is exact", () => {
      expect(res[0]).toBe(null);
      for (let i = 0; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
    });
  });
});

describe("Two lines", () => {
  const pt = 7;

  describe("withoutTransfers", () => {
    const dataset = twoLines.withoutTransfers;
    const raptorData = new RAPTORData(...dataset);
    const raptorInstance = new RAPTOR(raptorData);

    raptorInstance.run(dataset[0].at(0)!.id, pt, 0, { walkSpeed: 1 }, MAX_ROUNDS);

    const res = raptorInstance.getBestJourneys(pt);
    test("Run result is exact", () => {
      for (let i = 0; i < 2; ++i) expect(res[i]).toBe(null);
      for (let i = 4; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
      for (const i of [2, 3]) {
        expect(res[i]!.length).toBe(3);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(0);

        expect(Object.keys(res[i]![1]).length).toEqual(5);
        expect(res[i]![1].label.time).toBe(4);

        const js1 = res[i]![1];
        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(0);

        expect(Object.keys(res[i]![2]).length).toEqual(5);
        expect(res[i]![2].label.time).toBe(10);

        const js2 = res[i]![2];
        if (!("route" in js2)) throw new Error("Second journey step isn't VEHICLE");

        expect(js2.boardedAt).toBe(3);
        expect(js2.route.id).toBe(2);
        expect(js2.tripIndex).toBe(1);
      }
    });
  });

  describe("withSlowTransfers", () => {
    const dataset = twoLines.withSlowTransfers;
    const raptorData = new RAPTORData(...dataset);
    const raptorInstance = new RAPTOR(raptorData);

    raptorInstance.run(dataset[0].at(0)!.id, pt, 0, { walkSpeed: 1 }, MAX_ROUNDS);

    const res = raptorInstance.getBestJourneys(pt);
    test("Run result is exact", () => {
      for (let i = 0; i < 1; ++i) expect(res[i]).toBe(null);
      for (let i = 4; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
      for (const i of [1]) {
        expect(res[i]!.length).toBe(3);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(0);

        expect(Object.keys(res[i]![1]).length).toEqual(5);
        expect(res[i]![1].label.time).toBe(6);

        const js1 = res[i]![1];
        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(0);

        expect(Object.keys(res[i]![2]).length).toEqual(4);
        expect(res[i]![2].label.time).toBe(11);

        const js2 = res[i]![2];
        if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

        expect(js2.boardedAt).toBe(4);
        expect(js2.transfer.to).toBe(7);
        expect(js2.transfer.length).toBe(5);
      }
      for (const i of [2, 3]) {
        expect(res[i]!.length).toBe(3);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(0);

        expect(Object.keys(res[i]![1]).length).toEqual(5);
        expect(res[i]![1].label.time).toBe(4);

        const js1 = res[i]![1];
        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(0);

        expect(Object.keys(res[i]![2]).length).toEqual(5);
        expect(res[i]![2].label.time).toBe(10);

        const js2 = res[i]![2];
        if (!("route" in js2)) throw new Error("Second journey step isn't VEHICLE");

        expect(js2.boardedAt).toBe(3);
        expect(js2.route.id).toBe(2);
        expect(js2.tripIndex).toBe(1);
      }
    });
  });

  describe("withFastTransfers", () => {
    const dataset = twoLines.withFastTransfers;
    const raptorData = new RAPTORData(...dataset);
    const raptorInstance = new RAPTOR(raptorData);

    test("Run result is exact, early departure", () => {
      raptorInstance.run(dataset[0].at(0)!.id, pt, 0, { walkSpeed: 1 }, MAX_ROUNDS);

      const res = raptorInstance.getBestJourneys(pt);
      for (let i = 0; i < 1; ++i) expect(res[i]).toBe(null);
      for (let i = 4; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
      for (const i of [1]) {
        expect(res[i]!.length).toBe(3);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(0);

        expect(Object.keys(res[i]![1]).length).toEqual(5);
        expect(res[i]![1].label.time).toBe(6);

        const js1 = res[i]![1];
        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(0);

        expect(Object.keys(res[i]![2]).length).toEqual(4);
        expect(res[i]![2].label.time).toBe(11);

        const js2 = res[i]![2];
        if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

        expect(js2.boardedAt).toBe(4);
        expect(js2.transfer.to).toBe(7);
        expect(js2.transfer.length).toBe(5);
      }
      for (const i of [2, 3]) {
        expect(res[i]!.length).toBe(4);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(0);

        expect(Object.keys(res[i]![1]).length).toEqual(5);
        expect(res[i]![1].label.time).toBe(2);

        const js1 = res[i]![1];
        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(0);

        expect(Object.keys(res[i]![2]).length).toEqual(4);
        expect(res[i]![2].label.time).toBe(5);

        const js2 = res[i]![2];
        if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

        expect(js2.boardedAt).toBe(2);
        expect(js2.transfer.to).toBe(6);
        expect(js2.transfer.length).toBe(3);

        expect(Object.keys(res[i]![3]).length).toEqual(5);
        expect(res[i]![3].label.time).toBe(7);

        const js3 = res[i]![3];
        if (!("route" in js3)) throw new Error("Second journey step isn't VEHICLE");

        expect(js3.boardedAt).toBe(6);
        expect(js3.route.id).toBe(2);
        expect(js3.tripIndex).toBe(0);
      }
    });

    test("Run result is exact, late departure", () => {
      raptorInstance.run(dataset[0].at(0)!.id, pt, 2, { walkSpeed: 1 }, MAX_ROUNDS);

      const res = raptorInstance.getBestJourneys(pt);
      for (let i = 0; i < 1; ++i) expect(res[i]).toBe(null);
      for (let i = 4; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
      for (const i of [1]) {
        expect(res[i]!.length).toBe(3);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(2);

        expect(Object.keys(res[i]![1]).length).toEqual(5);
        expect(res[i]![1].label.time).toBe(8);

        const js1 = res[i]![1];
        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(1);

        expect(Object.keys(res[i]![2]).length).toEqual(4);
        expect(res[i]![2].label.time).toBe(13);

        const js2 = res[i]![2];
        if (!("transfer" in js2)) throw new Error("Second journey step isn't FOOT");

        expect(js2.boardedAt).toBe(4);
        expect(js2.transfer.to).toBe(7);
        expect(js2.transfer.length).toBe(5);
      }
      for (const i of [2, 3]) {
        expect(res[i]!.length).toBe(3);

        const js0 = res[i]![0];
        expect(Object.keys(js0).length).toBe(2);
        expect(Object.keys(js0)).toContain("compare");
        expect(Object.keys(js0)).toContain("label");
        expect(js0.label.time).toBe(2);

        expect(Object.keys(res[i]![1]).length).toEqual(5);
        expect(res[i]![1].label.time).toBe(6);

        const js1 = res[i]![1];
        if (!("route" in js1)) throw new Error("First journey step isn't VEHICLE");

        expect(js1.boardedAt).toBe(1);
        expect(js1.route.id).toBe(1);
        expect(js1.tripIndex).toBe(1);

        expect(Object.keys(res[i]![2]).length).toEqual(5);
        expect(res[i]![2].label.time).toBe(10);

        const js2 = res[i]![2];
        if (!("route" in js2)) throw new Error("Second journey step isn't VEHICLE");

        expect(js2.boardedAt).toBe(3);
        expect(js2.route.id).toBe(2);
        expect(js2.tripIndex).toBe(1);
      }
    });
  });
});
