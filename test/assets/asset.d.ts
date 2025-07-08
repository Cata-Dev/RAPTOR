import { McRAPTOR, Ordered, RAPTOR, RAPTORData } from "../../src";

interface TestAsset {
  data: ConstructorParameters<typeof RAPTORData<number, number, number>>;
  tests: {
    params: Parameters<RAPTOR<number, number, number>["run"]>;
    validate: (res: ReturnType<RAPTOR<number, number, number>["getBestJourneys"]>) => void;
  }[];
}

type TestDataset = [string, Record<string, TestAsset>];

interface McTestAsset<V extends Ordered<V>, CA extends [V, string][]> {
  data: ConstructorParameters<typeof RAPTORData<number, number, number>>;
  tests: {
    params: Parameters<McRAPTOR<V, CA, number, number, number>["run"]>;
    validate: (res: ReturnType<McRAPTOR<V, CA, number, number, number>["getBestJourneys"]>) => void;
  }[];
}

type McTestDataset<V extends Ordered<V>, CA extends [V, string][]> = [string, Record<string, McTestAsset<V, CA>>];
