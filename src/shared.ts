import RAPTOR from "./RAPTOR";
import { SerializedId, SharedRAPTORData } from "./structures";

export class SharedRAPTOR extends RAPTOR<number | SerializedId, number | SerializedId, number> {
  static readonly dataClass = SharedRAPTORData;
}
