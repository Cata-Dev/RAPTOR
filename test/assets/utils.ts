import { Ordered, Time, Journey } from "../../src";
import { TestAsset, McTestAsset } from "./asset";

const validateWithoutCriteria =
  <TimeVal, V extends Ordered<V>, CA extends [V, string][]>(timeType: Time<TimeVal>, validate: TestAsset<TimeVal>["tests"][number]["validate"]) =>
  (
    res: Parameters<McTestAsset<TimeVal, V, CA>["tests"][number]["validate"]>[0],
  ): [([Journey<TimeVal, number, number, V, CA>] | [])[], typeof res] => {
    let bestTime: TimeVal = timeType.MAX;
    const journeysWithoutCriteria = res.map<[Journey<TimeVal, number, number, V, CA>] | []>((journeys) => {
      const bestJourney = Array.from(journeys)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .sort((a, b) => timeType.order(a.at(-1)!.label.time, b.at(-1)!.label.time))
        .at(0);

      const jTime = bestJourney?.at(-1)?.label.time;
      if (jTime !== undefined)
        if (timeType.order(jTime, bestTime) < 0) {
          bestTime = jTime;
        } else return [];

      return bestJourney ? [bestJourney] : [];
    });
    validate(journeysWithoutCriteria as Parameters<TestAsset<TimeVal>["tests"][number]["validate"]>[0]);

    return [journeysWithoutCriteria, res.map((journeys, k) => journeys.filter((j) => j !== journeysWithoutCriteria[k][0]))];
  };

export { validateWithoutCriteria };
