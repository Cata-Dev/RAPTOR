import RAPTOR from "./main";
import { SharedRAPTORData } from "./SharedStructures";

export default class SharedRAPTOR extends RAPTOR<number, number, number> {
  constructor(data: SharedRAPTORData) {
    super(data);
  }
}
