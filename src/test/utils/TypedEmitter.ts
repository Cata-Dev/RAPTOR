import { EventEmitter } from "events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmittedEvents = Record<string | symbol, (...args: any) => any>;

export declare interface TypedEventEmitter<Events extends EmittedEvents> {
  on<E extends keyof Events>(event: Exclude<E, number>, listener: Events[E]): this;

  emit<E extends keyof Events>(event: Exclude<E, number>, ...args: Parameters<Events[E]>): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-declaration-merging
export class TypedEventEmitter<Events extends EmittedEvents> extends EventEmitter {}
