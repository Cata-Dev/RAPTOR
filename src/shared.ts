import RAPTOR from "./main";
import { SharedRAPTORData } from "./SharedStructures";

export default class SharedRAPTOR extends RAPTOR<number, number, number> {
  static readonly dataClass = SharedRAPTORData;

  constructor(data: SharedRAPTORData) {
    super(data);
  }
}
