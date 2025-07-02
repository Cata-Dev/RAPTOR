import { Id, MapRead, Stop, Route, IRAPTORData, JourneyStep, Journey } from "./structures";

interface RAPTORRunSettings {
  walkSpeed: number;
}

/**
 * @description A RAPTOR instance
 */
export default class BaseRAPTOR<C extends string[] = [], SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> {
  static defaultRounds = 6;

  readonly stops: MapRead<SI, Stop<SI, RI>>;
  readonly routes: MapRead<RI, Route<SI, RI, TI>>;

  protected readonly MAX_SAFE_TIMESTAMP: number;

  /** Round k <=> at most k transfers */
  protected k = 0;

  /**
   * @description Creates a new RAPTOR instance for a defined network.
   */
  constructor(data: IRAPTORData<SI, RI, TI>) {
    this.stops = data.stops;
    this.routes = data.routes;
    this.MAX_SAFE_TIMESTAMP = data.MAX_SAFE_TIMESTAMP;
  }

  /**
   * @param length Length of the path, in m.
   * @param walkSpeed Walk speed, in m/s
   * @returns Duration in ms
   */
  protected walkDuration(length: number, walkSpeed: RAPTORRunSettings["walkSpeed"]): number {
    return (length / walkSpeed) * 1_000;
  }

  protected traceBackFromStep(from: JourneyStep<SI, RI, C>, initRound: number): Journey<SI, RI, C> {
    if (initRound < 0 || initRound > this.k) throw new Error(`Invalid initRound (${initRound}) provided.`);

    let k = initRound;
    let trace: Journey<SI, RI, C> = [];

    let previousStep: JourneyStep<SI, RI, C> | null = from;
    while (previousStep !== null) {
      trace = ["boardedAt" in previousStep ? { ...previousStep, boardedAt: previousStep.boardedAt[0] } : previousStep, ...trace];

      if (k < 0) throw new Error(`No journey in initRound ${initRound}.`); // Unable to get back to source

      if (!("boardedAt" in previousStep)) {
        if (previousStep.label.time >= this.MAX_SAFE_TIMESTAMP) {
          k--;
          continue;
        }

        previousStep = null;
      } else {
        previousStep = previousStep.boardedAt[1];

        if (
          trace.find(
            (j) =>
              previousStep &&
              "boardedAt" in previousStep &&
              "boardedAt" in j &&
              j.label.time === previousStep.label.time &&
              j.boardedAt === previousStep.boardedAt[0],
          )
        )
          throw new Error(`Impossible journey (cyclic).`);
      }
    }

    return trace;
  }
}

export { RAPTORRunSettings };
