import { Criterion, Label, Ordered } from "../../src";

function setLabelValues<TimeVal, V extends Ordered<V>, CA extends [V, string][]>(
  label: Label<TimeVal, number, number, V, CA>,
  values: { [K in keyof CA]: V },
) {
  for (const [i, c] of (label as unknown as { criteria: Criterion<TimeVal, number, number, V, CA[number][1]>[] }).criteria.entries())
    (label as unknown as { values: Record<CA[number][1], CA[number][0]> }).values[c.name] = values[i];

  return label;
}

export { setLabelValues };
