import { describe, expect, test } from "@jest/globals";
import {
  bufferTime,
  Criterion,
  footDistance,
  InternalTimeInt,
  JourneyStep,
  Label,
  makeJSComparable,
  meanRiskInit,
  measureJourney,
  Route,
  successProbaInt,
  TimeInt,
  TimeScal,
  Timestamp,
} from "../src";
import { setLabelValues } from "./structures/utils";

const footDistanceTyped: Criterion<Timestamp, number, number, number, "footDistance"> = footDistance as Criterion<
  number,
  number,
  number,
  number,
  "footDistance"
>;
describe("Foot distance", () => {
  test("Naming", () => {
    expect(footDistanceTyped.name).toBe("footDistance");
  });

  const originJS: JourneyStep<Timestamp, number, number, number, [[number, "footDistance"]], "DEPARTURE"> = makeJSComparable({
    label: new Label<Timestamp, number, number, number, [[number, "footDistance"]]>(TimeScal, [footDistanceTyped], 0),
  });

  const vehicleJourneyStep = makeJSComparable<Timestamp, number, number, number, [[number, "footDistance"]], "VEHICLE">({
    boardedAt: [0, originJS],
    route: new Route(0, [0], [[[NaN, NaN]]]),
    tripIndex: 0,
    label: new Label<Timestamp, number, number, number, [[number, "footDistance"]]>(TimeScal, [footDistanceTyped], NaN),
  });

  const footJourneyStep1 = makeJSComparable<Timestamp, number, number, number, [[number, "footDistance"]], "FOOT">({
    boardedAt: [0, originJS],
    transfer: { to: 1, length: 3 },
    label: setLabelValues(new Label<Timestamp, number, number, number, [[number, "footDistance"]]>(TimeScal, [footDistanceTyped], NaN), [4]),
  });

  const footJourneyStep2 = makeJSComparable<Timestamp, number, number, number, [[number, "footDistance"]], "FOOT">({
    boardedAt: [0, footJourneyStep1],
    transfer: { to: 0, length: 5 },
    label: setLabelValues(new Label<Timestamp, number, number, number, [[number, "footDistance"]]>(TimeScal, [footDistanceTyped], NaN), [6]),
  });

  test("Update with vehicle", () => {
    expect(footDistanceTyped.update([originJS], vehicleJourneyStep, TimeScal, NaN, 0)).toBe(0);
    expect(footDistanceTyped.update([originJS, footJourneyStep1], vehicleJourneyStep, TimeScal, NaN, 0)).toBe(4);
  });

  test("Update with foot transfer", () => {
    expect(footDistanceTyped.update([originJS], footJourneyStep2, TimeScal, NaN, 0)).toBe(5);
    expect(footDistanceTyped.update([originJS, footJourneyStep1], footJourneyStep2, TimeScal, NaN, 0)).toBe(9);
  });

  test("Wrong usage", () => {
    expect(() => footDistanceTyped.update([], footJourneyStep1, TimeScal, NaN, 0)).toThrow("A journey should at least contain the DEPARTURE step.");
  });
});

const bufferTimeTyped = bufferTime as Criterion<Timestamp, number, number, number, "bufferTime">;
describe("Buffer time", () => {
  test("Naming", () => {
    expect(bufferTimeTyped.name).toBe("bufferTime");
  });

  const originJS: JourneyStep<Timestamp, number, number, number, [[number, "bufferTime"]], "DEPARTURE"> = makeJSComparable({
    label: new Label<Timestamp, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 0),
  });

  const footJourneyStep = makeJSComparable<Timestamp, number, number, number, [[number, "bufferTime"]], "FOOT">({
    boardedAt: [0, originJS],
    transfer: { to: 0, length: 3 },
    label: new Label<Timestamp, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 0),
  });

  const vehicleJourneyStep1 = makeJSComparable<Timestamp, number, number, number, [[number, "bufferTime"]], "VEHICLE">({
    boardedAt: [0, originJS],
    route: new Route(0, [0], [[[NaN, 5]]]),
    tripIndex: 0,
    label: setLabelValues(new Label<Timestamp, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 4), [-5]),
  });

  const vehicleJourneyStep2 = makeJSComparable<Timestamp, number, number, number, [[number, "bufferTime"]], "VEHICLE">({
    boardedAt: [0, vehicleJourneyStep1],
    route: new Route(1, [0], [[[NaN, 8]]]),
    tripIndex: 0,
    label: setLabelValues(new Label<Timestamp, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 8), [NaN]),
  });

  test("Update with foot transfer", () => {
    expect(bufferTimeTyped.update([originJS], footJourneyStep, TimeScal, NaN, 0)).toBe(-Infinity);
    expect(bufferTimeTyped.update([originJS, vehicleJourneyStep1], footJourneyStep, TimeScal, NaN, 0)).toBe(-5);
  });

  test("Update with vehicle", () => {
    expect(bufferTimeTyped.update([originJS], vehicleJourneyStep1, TimeScal, NaN, 0)).toBe(-5);
    expect(bufferTimeTyped.update([originJS, vehicleJourneyStep1], vehicleJourneyStep2, TimeScal, NaN, 0)).toBe(-4);
  });

  test("Wrong usage", () => {
    expect(() => bufferTimeTyped.update([], vehicleJourneyStep1, TimeScal, NaN, 0)).toThrow("A journey should at least contain the DEPARTURE step.");
  });
});

describe("Success probability (interval)", () => {
  const successProbaIntTyped = successProbaInt as Criterion<InternalTimeInt, number, number, number, "successProbaInt">;

  test("Naming", () => {
    expect(successProbaIntTyped.name).toBe("successProbaInt");
  });

  const originJS: JourneyStep<InternalTimeInt, number, number, number, [[number, "successProbaInt"]], "DEPARTURE"> = makeJSComparable({
    label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [0, 0]),
  });

  const footJourneyStep = makeJSComparable<InternalTimeInt, number, number, number, [[number, "successProbaInt"]], "FOOT">({
    boardedAt: [0, originJS],
    transfer: { to: 0, length: 3 },
    label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [3, 3]),
  });

  const vehicleJourneyStep1 = makeJSComparable<InternalTimeInt, number, number, number, [[number, "successProbaInt"]], "VEHICLE">({
    boardedAt: [0, originJS],
    route: new Route(
      0,
      [0],
      [
        [
          [
            [NaN, NaN],
            [5, 5],
          ],
        ],
      ],
    ),
    tripIndex: 0,
    label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [6, 6]),
  });

  const vehicleJourneyStep2 = makeJSComparable<InternalTimeInt, number, number, number, [[number, "successProbaInt"]], "VEHICLE">({
    boardedAt: [0, originJS],
    route: new Route(
      1,
      [0],
      [
        [
          [
            [NaN, NaN],
            [8, 8],
          ],
        ],
      ],
    ),
    tripIndex: 0,
    label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [NaN, NaN]),
  });

  test("Update with foot transfer", () => {
    expect(successProbaIntTyped.update([originJS], footJourneyStep, TimeInt, [NaN, NaN], 0)).toBe(-1);
    expect(successProbaIntTyped.update([originJS, vehicleJourneyStep1], footJourneyStep, TimeInt, [NaN, NaN], 0)).toBe(
      vehicleJourneyStep1.label.value("successProbaInt"),
    );
  });

  test("Update with vehicle", () => {
    // Not intersecting
    expect(successProbaIntTyped.update([originJS], vehicleJourneyStep1, TimeInt, [NaN, NaN], 0)).toBe(-1);
    expect(successProbaIntTyped.update([originJS, vehicleJourneyStep1], vehicleJourneyStep2, TimeInt, [NaN, NaN], 0)).toBe(-1);
    // Missing
    expect(
      successProbaIntTyped.update(
        [originJS, vehicleJourneyStep1],
        {
          boardedAt: [0, vehicleJourneyStep1],
          route: new Route(
            1,
            [0],
            [
              [
                [
                  [NaN, NaN],
                  [4, 5],
                ],
              ],
            ],
          ),
          tripIndex: 0,
        },
        TimeInt,
        [NaN, NaN],
        0,
      ),
    ).toBe(-0);

    // Intersecting
    // Full => 50%
    expect(
      successProbaIntTyped.update(
        [
          originJS,
          makeJSComparable({
            label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [4, 5]),
          }),
        ],
        {
          boardedAt: [0, originJS],
          route: new Route(
            1,
            [0],
            [
              [
                [
                  [NaN, NaN],
                  [4, 5],
                ],
              ],
            ],
          ),
          tripIndex: 0,
        },
        TimeInt,
        [NaN, NaN],
        0,
      ),
    ).toBe(-0.5);

    // [ ]
    //  []
    // 1 * 1/3 + 0.5 * 2/3
    expect(
      successProbaIntTyped.update(
        [
          originJS,
          makeJSComparable({
            label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [4, 6]),
          }),
        ],
        {
          boardedAt: [0, originJS],
          route: new Route(
            1,
            [0],
            [
              [
                [
                  [NaN, NaN],
                  [5, 6],
                ],
              ],
            ],
          ),
          tripIndex: 0,
        },
        TimeInt,
        [NaN, NaN],
        0,
      ),
    ).toBe(-((1 + 0.5 * 2) / 3));

    // |
    // [ ]
    // 0.5 * 1/3 + 1 * 2/3
    expect(
      successProbaIntTyped.update(
        [
          originJS,
          makeJSComparable({
            label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [4, 4]),
          }),
        ],
        {
          boardedAt: [0, originJS],
          route: new Route(
            1,
            [0],
            [
              [
                [
                  [NaN, NaN],
                  [4, 6],
                ],
              ],
            ],
          ),
          tripIndex: 0,
        },
        TimeInt,
        [NaN, NaN],
        0,
      ),
    ).toBe(-((0.5 + 2) / 3));

    //   |
    // [ ]
    // 0 * 2/3 + 0.5 * 1/3
    expect(
      successProbaIntTyped.update(
        [
          originJS,
          makeJSComparable({
            label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [6, 6]),
          }),
        ],
        {
          boardedAt: [0, originJS],
          route: new Route(
            1,
            [0],
            [
              [
                [
                  [NaN, NaN],
                  [4, 6],
                ],
              ],
            ],
          ),
          tripIndex: 0,
        },
        TimeInt,
        [NaN, NaN],
        0,
      ),
    ).toBe(-(0.5 / 3));
  });

  // [ ]
  //  [ ]
  // 1 * 1/4 + 0.5 * 2/4 + 1 * 1/4
  expect(
    successProbaIntTyped.update(
      [
        originJS,
        makeJSComparable({
          label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [4, 6]),
        }),
      ],
      {
        boardedAt: [0, originJS],
        route: new Route(
          1,
          [0],
          [
            [
              [
                [NaN, NaN],
                [5, 7],
              ],
            ],
          ],
        ),
        tripIndex: 0,
      },
      TimeInt,
      [NaN, NaN],
      0,
    ),
  ).toBe(-((1 + 0.5 * 2 + 1) / 4));

  // Included:
  // [   ]
  //  [ ]
  // 1/5 + 0.5 * 3/5
  expect(
    successProbaIntTyped.update(
      [
        originJS,
        makeJSComparable({
          label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [4, 8]),
        }),
      ],
      {
        boardedAt: [0, originJS],
        route: new Route(
          1,
          [0],
          [
            [
              [
                [NaN, NaN],
                [5, 7],
              ],
            ],
          ],
        ),
        tripIndex: 0,
      },
      TimeInt,
      [NaN, NaN],
      0,
    ),
  ).toBe(-((1 + 0.5 * 3) / 5));

  //  [  ]
  // [  ]
  // 0 * 1/5 + 0.5 * 3/5 + 0 * 1/5
  expect(
    successProbaIntTyped.update(
      [
        originJS,
        makeJSComparable({
          label: new Label<InternalTimeInt, number, number, number, [[number, "successProbaInt"]]>(TimeInt, [successProbaIntTyped], [5, 8]),
        }),
      ],
      {
        boardedAt: [0, originJS],
        route: new Route(
          1,
          [0],
          [
            [
              [
                [NaN, NaN],
                [4, 7],
              ],
            ],
          ],
        ),
        tripIndex: 0,
      },
      TimeInt,
      [NaN, NaN],
      0,
    ),
  ).toBe(-((0.5 * 3) / 5));

  test("Wrong usage", () => {
    expect(() => successProbaIntTyped.update([], vehicleJourneyStep1, TimeInt, [NaN, NaN], 0)).toThrow(
      "A journey should at least contain the DEPARTURE step.",
    );
  });
});

describe("Mean Risk", () => {
  describe("c=0", () => {
    const meanRisk0 = meanRiskInit(0);
    const meanRisk0Typed = meanRisk0 as Criterion<InternalTimeInt, number, number, number, `meanRisk-0`>;
    test("Naming", () => {
      expect(meanRisk0Typed.name).toBe("meanRisk-0");
    });

    const originJS: JourneyStep<InternalTimeInt, number, number, number, [[number, "meanRisk-0"]], "DEPARTURE"> = makeJSComparable({
      label: new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-0"]]>(TimeInt, [meanRisk0Typed], [0, 0]),
    });

    const vehicleJourneyStep = makeJSComparable<InternalTimeInt, number, number, number, [[number, "meanRisk-0"]], "VEHICLE">({
      boardedAt: [0, originJS],
      route: new Route(
        0,
        [0],
        [
          [
            [
              [3, 8],
              [NaN, NaN],
            ],
          ],
        ],
      ),
      tripIndex: 0,
      label: new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-0"]]>(TimeInt, [meanRisk0Typed], [NaN, NaN]),
    });

    const footJourneyStep1 = makeJSComparable<InternalTimeInt, number, number, number, [[number, "meanRisk-0"]], "FOOT">({
      boardedAt: [0, originJS],
      transfer: { to: 1, length: 3 },
      label: setLabelValues(new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-0"]]>(TimeInt, [meanRisk0Typed], [NaN, NaN]), [4]),
    });

    const footJourneyStep2 = makeJSComparable<InternalTimeInt, number, number, number, [[number, "meanRisk-0"]], "FOOT">({
      boardedAt: [0, footJourneyStep1],
      transfer: { to: 0, length: 5 },
      label: setLabelValues(new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-0"]]>(TimeInt, [meanRisk0Typed], [NaN, NaN]), [6]),
    });

    test("Update with vehicle", () => {
      expect(meanRisk0Typed.update([originJS], vehicleJourneyStep, TimeInt, [3, 8], 0)).toBe(5.5);
      expect(meanRisk0Typed.update([originJS, footJourneyStep1], vehicleJourneyStep, TimeInt, [3, 8], 0)).toBe(5.5);
    });

    test("Update with foot transfer", () => {
      expect(meanRisk0Typed.update([originJS], footJourneyStep1, TimeInt, [3, 7], 0)).toBe(5);
      expect(meanRisk0Typed.update([originJS, footJourneyStep1], footJourneyStep2, TimeInt, [8, 12], 0)).toBe(10);
    });
  });

  describe("c=0.5", () => {
    const meanRisk05 = meanRiskInit(0.5);
    const meanRisk05Typed = meanRisk05 as Criterion<InternalTimeInt, number, number, number, `meanRisk-0.5`>;
    test("Naming", () => {
      expect(meanRisk05Typed.name).toBe("meanRisk-0.5");
    });

    const originJS: JourneyStep<InternalTimeInt, number, number, number, [[number, "meanRisk-0.5"]], "DEPARTURE"> = makeJSComparable({
      label: new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-0.5"]]>(TimeInt, [meanRisk05Typed], [0, 0]),
    });

    const vehicleJourneyStep = makeJSComparable<InternalTimeInt, number, number, number, [[number, "meanRisk-0.5"]], "VEHICLE">({
      boardedAt: [0, originJS],
      route: new Route(
        0,
        [0],
        [
          [
            [
              [3, 8],
              [NaN, NaN],
            ],
          ],
        ],
      ),
      tripIndex: 0,
      label: new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-0.5"]]>(TimeInt, [meanRisk05Typed], [NaN, NaN]),
    });

    const footJourneyStep1 = makeJSComparable<InternalTimeInt, number, number, number, [[number, "meanRisk-0.5"]], "FOOT">({
      boardedAt: [0, originJS],
      transfer: { to: 1, length: 3 },
      label: setLabelValues(new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-0.5"]]>(TimeInt, [meanRisk05Typed], [NaN, NaN]), [
        4,
      ]),
    });

    const footJourneyStep2 = makeJSComparable<InternalTimeInt, number, number, number, [[number, "meanRisk-0.5"]], "FOOT">({
      boardedAt: [0, footJourneyStep1],
      transfer: { to: 0, length: 5 },
      label: setLabelValues(new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-0.5"]]>(TimeInt, [meanRisk05Typed], [NaN, NaN]), [
        6,
      ]),
    });

    test("Update with vehicle", () => {
      expect(meanRisk05Typed.update([originJS], vehicleJourneyStep, TimeInt, [3, 8], 0)).toBe(6.75);
      expect(meanRisk05Typed.update([originJS, footJourneyStep1], vehicleJourneyStep, TimeInt, [3, 8], 0)).toBe(6.75);
    });

    test("Update with foot transfer", () => {
      expect(meanRisk05Typed.update([originJS], footJourneyStep1, TimeInt, [3, 7], 0)).toBe(6);
      expect(meanRisk05Typed.update([originJS, footJourneyStep1], footJourneyStep2, TimeInt, [8, 12], 0)).toBe(11);
    });
  });

  describe("c=1", () => {
    const meanRisk1 = meanRiskInit(1);
    const meanRisk1Typed = meanRisk1 as Criterion<InternalTimeInt, number, number, number, `meanRisk-1`>;
    test("Naming", () => {
      expect(meanRisk1Typed.name).toBe("meanRisk-1");
    });

    const originJS: JourneyStep<InternalTimeInt, number, number, number, [[number, "meanRisk-1"]], "DEPARTURE"> = makeJSComparable({
      label: new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-1"]]>(TimeInt, [meanRisk1Typed], [0, 0]),
    });

    const vehicleJourneyStep = makeJSComparable<InternalTimeInt, number, number, number, [[number, "meanRisk-1"]], "VEHICLE">({
      boardedAt: [0, originJS],
      route: new Route(
        0,
        [0],
        [
          [
            [
              [3, 8],
              [NaN, NaN],
            ],
          ],
        ],
      ),
      tripIndex: 0,
      label: new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-1"]]>(TimeInt, [meanRisk1Typed], [NaN, NaN]),
    });

    const footJourneyStep1 = makeJSComparable<InternalTimeInt, number, number, number, [[number, "meanRisk-1"]], "FOOT">({
      boardedAt: [0, originJS],
      transfer: { to: 1, length: 3 },
      label: setLabelValues(new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-1"]]>(TimeInt, [meanRisk1Typed], [NaN, NaN]), [4]),
    });

    const footJourneyStep2 = makeJSComparable<InternalTimeInt, number, number, number, [[number, "meanRisk-1"]], "FOOT">({
      boardedAt: [0, footJourneyStep1],
      transfer: { to: 0, length: 5 },
      label: setLabelValues(new Label<InternalTimeInt, number, number, number, [[number, "meanRisk-1"]]>(TimeInt, [meanRisk1Typed], [NaN, NaN]), [6]),
    });

    test("Update with vehicle", () => {
      expect(meanRisk1Typed.update([originJS], vehicleJourneyStep, TimeInt, [3, 8], 0)).toBe(8);
      expect(meanRisk1Typed.update([originJS, footJourneyStep1], vehicleJourneyStep, TimeInt, [3, 8], 0)).toBe(8);
    });

    test("Update with foot transfer", () => {
      expect(meanRisk1Typed.update([originJS], footJourneyStep1, TimeInt, [3, 7], 0)).toBe(7);
      expect(meanRisk1Typed.update([originJS, footJourneyStep1], footJourneyStep2, TimeInt, [8, 12], 0)).toBe(12);
    });
  });
});

describe("Measuring journey", () => {
  const originJS = makeJSComparable({
    label: new Label<Timestamp, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 0),
  });

  const vehicleJourneyStep = makeJSComparable<Timestamp, number, number, number, [[number, "bufferTime"]], "VEHICLE">({
    label: setLabelValues(new Label<Timestamp, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 0), [7]),
    boardedAt: [0, originJS],
    route: new Route(1, [0], [[[4, 6]]]),
    tripIndex: 0,
  });

  const footJourneyStep1 = makeJSComparable<Timestamp, number, number, number, [[number, "bufferTime"]], "FOOT">({
    label: setLabelValues(new Label<Timestamp, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 0), [5]),
    boardedAt: [0, originJS],
    transfer: { to: 0, length: 3 },
  });

  const footJourneyStep2 = makeJSComparable<Timestamp, number, number, number, [[number, "bufferTime"]], "FOOT">({
    label: setLabelValues(new Label<Timestamp, number, number, number, [[number, "bufferTime"]]>(TimeScal, [bufferTimeTyped], 0), [3]),
    boardedAt: [0, originJS],
    transfer: { to: 0, length: 5 },
  });

  describe("with footDistance, having already bufferTime", () => {
    const measure1 = measureJourney(footDistanceTyped, TimeScal, [originJS], 0);
    const measure2 = measureJourney(footDistanceTyped, TimeScal, [originJS, vehicleJourneyStep], 0);
    const measure3 = measureJourney(footDistanceTyped, TimeScal, [originJS, footJourneyStep1], 0);
    const measure4 = measureJourney(footDistanceTyped, TimeScal, [originJS, footJourneyStep1, vehicleJourneyStep], 0);
    const measure5 = measureJourney(footDistanceTyped, TimeScal, [originJS, footJourneyStep1, footJourneyStep2], 0);
    const measure6 = measureJourney(
      footDistanceTyped,
      TimeScal,
      [originJS, footJourneyStep1, vehicleJourneyStep, footJourneyStep2, vehicleJourneyStep],
      0,
    );

    test("Old criteria (bufferTime) still present and correct", () => {
      expect(measure1.at(-1)?.label.value("bufferTime")).toBe(originJS.label.value("bufferTime"));
      expect(measure2.at(-1)?.label.value("bufferTime")).toBe(vehicleJourneyStep.label.value("bufferTime"));
      expect(measure3.at(-1)?.label.value("bufferTime")).toBe(footJourneyStep1.label.value("bufferTime"));
      expect(measure4.at(-1)?.label.value("bufferTime")).toBe(vehicleJourneyStep.label.value("bufferTime"));
      expect(measure5.at(-1)?.label.value("bufferTime")).toBe(footJourneyStep2.label.value("bufferTime"));
      expect(measure6.at(-1)?.label.value("bufferTime")).toBe(vehicleJourneyStep.label.value("bufferTime"));
    });

    test("Measured criterion (footDistance) present and correct", () => {
      expect(measure1.at(-1)?.label.value("footDistance")).toBe(0);
      expect(measure2.at(-1)?.label.value("footDistance")).toBe(0);
      expect(measure3.at(-1)?.label.value("footDistance")).toBe(3);
      expect(measure4.at(-1)?.label.value("footDistance")).toBe(3);
      expect(measure5.at(-1)?.label.value("footDistance")).toBe(8);
      expect(measure6.at(-1)?.label.value("footDistance")).toBe(8);
    });
  });
});
