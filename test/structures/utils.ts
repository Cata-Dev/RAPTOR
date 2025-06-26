import { Criterion, Label } from "../../src/main";

function setLabelValues<C extends string[]>(label: Label<number, number, C>, values: { [K in keyof C]: number }) {
  for (const [i, c] of (label as unknown as { criteria: Criterion<number, number, C>[] }).criteria.entries())
    (label as unknown as { values: Record<C[number] | "time", number> }).values[c.name] = values[i];

  return label;
}

export { setLabelValues };
