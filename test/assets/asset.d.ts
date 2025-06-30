import { McRAPTOR, RAPTOR, RAPTORData } from "../../src";

interface TestAsset {
  data: ConstructorParameters<typeof RAPTORData<number, number, number>>;
  tests: {
    params: Parameters<RAPTOR<number, number, number>["run"]>;
    validate: (res: ReturnType<RAPTOR<number, number, number>["getBestJourneys"]>) => void;
  }[];
}

type TestDataset = [string, Record<string, TestAsset>];

interface McTestAsset<C extends string[]> {
  data: ConstructorParameters<typeof RAPTORData<number, number, number>>;
  tests: {
    params: Parameters<McRAPTOR<C, number, number, number>["run"]>;
    validate: (res: ReturnType<McRAPTOR<C, number, number, number>["getBestJourneys"]>) => void;
  }[];
}

type McTestDataset<C extends string[]> = [string, Record<string, McTestAsset<C>>];
