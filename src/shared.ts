import RAPTOR from "./main";
import { SerializedId, SharedRAPTORData } from "./SharedStructures";

export default class SharedRAPTOR extends RAPTOR<number | SerializedId, number | SerializedId, number> {
  static readonly dataClass = SharedRAPTORData;

  constructor(data: SharedRAPTORData) {
    super(data);
  }
}
