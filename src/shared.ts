import RAPTOR from "./RAPTOR";
import { SerializedId, SharedRAPTORData } from "./SharedStructures";

export class SharedRAPTOR extends RAPTOR<number | SerializedId, number | SerializedId, number> {
  static readonly dataClass = SharedRAPTORData;

  constructor(data: SharedRAPTORData) {
    super(data);
  }
}
