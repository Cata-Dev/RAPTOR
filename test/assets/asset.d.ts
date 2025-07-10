import { McRAPTOR, Ordered, RAPTOR, RAPTORData } from "../../src";

interface TestAsset<TimeVal> {
  data: ConstructorParameters<typeof RAPTORData<TimeVal, number, number, number>>;
  tests: {
    params: Parameters<RAPTOR<TimeVal, number, number, number>["run"]>;
    validate: (res: ReturnType<RAPTOR<TimeVal, number, number, number>["getBestJourneys"]>) => void;
  }[];
}

type TestDataset<TimeVal> = [string, Record<string, TestAsset<TimeVal>>];

interface McTestAsset<TimeVal, V extends Ordered<V>, CA extends [V, string][]> {
  data: TestAsset<TimeVal>["data"];
  tests: {
    params: Parameters<McRAPTOR<TimeVal, V, CA, number, number, number>["run"]>;
    validate: (res: ReturnType<McRAPTOR<TimeVal, V, CA, number, number, number>["getBestJourneys"]>) => void;
  }[];
}

type McTestDataset<TimeVal, V extends Ordered<V>, CA extends [V, string][]> = [string, Record<string, McTestAsset<TimeVal, V, CA>>];
