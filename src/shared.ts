/* eslint-disable @typescript-eslint/no-useless-constructor */
import McRAPTOR from "./McRAPTOR";
import RAPTOR from "./RAPTOR";
import { Criterion, SerializedId, SharedID, SharedRAPTORData } from "./structures";

export class SharedRAPTOR extends RAPTOR<SharedID, SharedID, SharedID> {
  constructor(data: SharedRAPTORData) {
    super(data);
  }
}

export class McSharedRAPTOR<C extends string[]> extends McRAPTOR<C, number | SerializedId, number | SerializedId, number> {
  constructor(data: SharedRAPTORData, criteria: { [K in keyof C]: Criterion<SharedID, SharedID, C> }) {
    super(data, criteria);
  }
}
