/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe } from "@jest/globals";
import RAPTOR from "../src/RAPTOR";
import { RAPTORData } from "../src/Structures";
import oneLine from "./assets/oneLine";
import { test, expect } from "@jest/globals";

const MAX_ROUNDS = 5;

let dataset = oneLine.withoutTransfers;
let pt = 4;

describe("withoutTransfers", () => {
  const raptorData = new RAPTORData(...dataset);
  const raptorInstance = new RAPTOR(raptorData);

  raptorInstance.run(dataset[0].at(0)!.id, pt, 0, { walkSpeed: 1 }, MAX_ROUNDS);

  const res = raptorInstance.getBestJourneys(pt);
  test("Run result is exact", () => {
    expect(res[0]).toBe(null);
    for (let i = 3; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
    for (const i of [1, 2]) {
      expect(res[i]!.length).toBe(2);

      expect(Object.keys(res[i]![0]).length).toBe(2);
      expect(Object.keys(res[i]![0])).toContain("compare");
      expect(Object.keys(res[i]![0])).toContain("label");
      expect(res[i]![0].label.time).toBe(0);

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

dataset = oneLine.withSlowTransfers;
describe("withSlowTransfers", () => {
  const raptorData = new RAPTORData(...dataset);
  const raptorInstance = new RAPTOR(raptorData);

  raptorInstance.run(dataset[0].at(0)!.id, pt, 0, { walkSpeed: 1 }, MAX_ROUNDS);

  const res = raptorInstance.getBestJourneys(pt);
  test("Run result is exact", () => {
    expect(res[0]).toBe(null);
    for (let i = 3; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
    for (const i of [1, 2]) {
      expect(res[i]!.length).toBe(2);

      expect(Object.keys(res[i]![0]).length).toBe(2);
      expect(Object.keys(res[i]![0])).toContain("compare");
      expect(Object.keys(res[i]![0])).toContain("label");
      expect(res[i]![0].label.time).toBe(0);

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

dataset = oneLine.withFastTransfers;
describe("withFastTransfers", () => {
  const raptorData = new RAPTORData(...dataset);
  const raptorInstance = new RAPTOR(raptorData);

  raptorInstance.run(dataset[0].at(0)!.id, pt, 0, { walkSpeed: 1 }, MAX_ROUNDS);

  const res = raptorInstance.getBestJourneys(pt);
  test("Run result is exact", () => {
    expect(res[0]).toBe(null);
    for (let i = 3; i < MAX_ROUNDS; ++i) expect(res[i]).toBe(null);
    for (const i of [1, 2]) {
      expect(res[i]!.length).toBe(2);

      expect(Object.keys(res[i]![0]).length).toBe(2);
      expect(Object.keys(res[i]![0])).toContain("compare");
      expect(Object.keys(res[i]![0])).toContain("label");
      expect(res[i]![0].label.time).toBe(0);

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
