import BaseRAPTOR from "./base";
import RAPTOR from "./RAPTOR";
import { SerializedId, SharedRAPTORData } from "./SharedStructures";

export class BaseSharedRAPTOR extends BaseRAPTOR<number | SerializedId, number | SerializedId, number> {
  static readonly dataClass = SharedRAPTORData;
}

export class SharedRAPTOR extends RAPTOR<number | SerializedId, number | SerializedId, number> {
  static readonly dataClass = SharedRAPTORData;
}
