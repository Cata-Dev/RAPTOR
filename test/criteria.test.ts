import { describe, expect, test } from "@jest/globals";
import { setLabelValues } from "./structures/utils";

describe("Foot distance", () => {
  const footDistanceTyped: Criterion<number, number, ["footDistance"], "footDistance"> = footDistance;

  test("Naming", () => {
    expect(footDistanceTyped.name).toBe("footDistance");
  });

  const originJS: JourneyStep<number, number, ["footDistance"], "DEPARTURE"> = makeJSComparable({
    label: new Label<number, number, ["footDistance"]>([footDistanceTyped], 0),
  });

  const vehicleJourneyStep = makeJSComparable<number, number, ["footDistance"], "VEHICLE">({
    boardedAt: [0, originJS],
    route: new Route(0, [1], [{ id: 0, times: [[1, 1]] }]),
    tripIndex: 0,
    label: new Label<number, number, ["footDistance"]>([footDistanceTyped], 0),
  });

  const footJourneyStep1 = makeJSComparable<number, number, ["footDistance"], "FOOT">({
    boardedAt: [0, originJS],
    transfer: { to: 1, length: 3 },
    label: setLabelValues(new Label<number, number, ["footDistance"]>([footDistanceTyped], 0), [4]),
  });

  const footJourneyStep2 = makeJSComparable<number, number, ["footDistance"], "FOOT">({
    boardedAt: [0, originJS],
    transfer: { to: 1, length: 5 },
    label: setLabelValues(new Label<number, number, ["footDistance"]>([footDistanceTyped], 0), [6]),
  });

  test("Update with vehicle", () => {
    expect(footDistanceTyped.update([originJS], vehicleJourneyStep, 0, 1)).toBe(0);
    expect(footDistanceTyped.update([originJS, footJourneyStep1], vehicleJourneyStep, 0, 1)).toBe(4);
  });

  test("Update with foot transfer", () => {
    expect(footDistanceTyped.update([originJS], footJourneyStep2, 0, 1)).toBe(5);
    expect(footDistanceTyped.update([originJS, footJourneyStep1], footJourneyStep2, 0, 1)).toBe(9);
  });
});
