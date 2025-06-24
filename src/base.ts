import { Id, MapRead, Stop, Route, IRAPTORData } from "./structures";

interface RAPTORRunSettings {
  walkSpeed: number;
}

/**
 * @description A RAPTOR instance
 */
export default class BaseRAPTOR<SI extends Id = Id, RI extends Id = Id, TI extends Id = Id> {
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
    return length / walkSpeed;
  }
}

export { RAPTORRunSettings };
