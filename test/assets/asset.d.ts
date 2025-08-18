import { McRAPTOR, RAPTOR, RAPTORData } from "../../src";
import BaseRAPTOR from "../../src/base";

interface TestAsset<TimeVal> {
  data: ConstructorParameters<typeof RAPTORData<TimeVal, number, number, number>>;
  tests: {
    params: Parameters<RAPTOR<TimeVal, number, number, number>["run"]>;
    validate: (
      res: ReturnType<BaseRAPTOR<TimeVal, number, number, number>["getBestJourneys"]>,
      raptorInstance: InstanceType<typeof BaseRAPTOR<TimeVal, number, number, number>>,
    ) => void;
  }[];
}

type TestDataset<TimeVal> = [string, Record<string, TestAsset<TimeVal>>];

interface McTestAsset<TimeVal, V, CA extends [V, string][]> {
  data: TestAsset<TimeVal>["data"];
  tests: {
    params: Parameters<McRAPTOR<TimeVal, V, CA, number, number, number>["run"]>;
    validate: (res: InstanceType<typeof McRAPTOR<TimeVal, V, CA, number, number, number>>) => void;
  }[];
}

type McTestDataset<TimeVal, V, CA extends [V, string][]> = [string, Record<string, McTestAsset<TimeVal, V, CA>>];
