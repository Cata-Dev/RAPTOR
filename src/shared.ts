import McRAPTOR from "./McRAPTOR";
import RAPTOR from "./RAPTOR";
import { Criterion, SharedID, SharedRAPTORData } from "./structures";

const convertBackJourneyStep =
  <TimeVal, V, CA extends [V, string][]>(stops: SharedRAPTORData<TimeVal>["stops"]) =>
  (js: NonNullable<ReturnType<McRAPTOR<TimeVal, V, CA, SharedID, SharedID, number>["getBestJourneys"]>[number]>[number][number]) => {
    return {
      ...js,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ...("boardedAt" in js ? { boardedAt: stops.get(js.boardedAt)!.id } : {}),
      ...("transfer" in js
        ? {
            transfer: {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              to: stops.get(js.transfer.to)!.id,
              length: js.transfer.length,
            },
          }
        : {}),
    };
  };

export class SharedRAPTOR<TimeVal> extends RAPTOR<TimeVal, SharedID, number, number> {
  constructor(protected readonly data: SharedRAPTORData<TimeVal>) {
    super(data);
  }

  run(...params: Parameters<RAPTOR<TimeVal, SharedID, SharedID, SharedID>["run"]>) {
    const [ps, pt, ...rem] = params;

    const convertedPs = typeof ps === "string" ? ps : this.data.stopPointerFromId(ps);
    if (convertedPs === undefined) throw new Error(`Unable to retrieve source stop ${ps}`);

    const convertedPt = typeof pt === "string" ? pt : this.data.stopPointerFromId(pt);
    if (convertedPt === undefined) throw new Error(`Unable to retrieve target stop ${pt}`);

    super.run(convertedPs, convertedPt, ...rem);
  }

  getBestJourneys(pt: SharedID): ReturnType<RAPTOR<TimeVal, SharedID, SharedID, number>["getBestJourneys"]> {
    const convertedPt = typeof pt === "string" ? pt : this.data.stopPointerFromId(pt);
    if (convertedPt === undefined) throw new Error(`Unable to retrieve target stop ${pt}`);

    return super.getBestJourneys(convertedPt).map((journeys) => (journeys.length ? [journeys[0].map(convertBackJourneyStep(this.data.stops))] : []));
  }
}

export class McSharedRAPTOR<TimeVal, V, CA extends [V, string][]> extends McRAPTOR<TimeVal, V, CA, SharedID, number, number> {
  constructor(
    protected readonly data: SharedRAPTORData<TimeVal>,
    criteria: { [K in keyof CA]: Criterion<TimeVal, SharedID, SharedID, CA[K][0], CA[K][1]> },
  ) {
    super(data, criteria);
  }

  run(...params: Parameters<McRAPTOR<TimeVal, V, CA, SharedID, SharedID, number>["run"]>) {
    const [ps, pt, ...rem] = params;

    const convertedPs = typeof ps === "string" ? ps : this.data.stopPointerFromId(ps);
    if (convertedPs === undefined) throw new Error(`Unable to retrieve source stop ${ps}`);

    const convertedPt = typeof pt === "string" ? pt : this.data.stopPointerFromId(pt);
    if (convertedPt === undefined) throw new Error(`Unable to retrieve target stop ${pt}`);

    super.run(convertedPs, convertedPt, ...rem);
  }

  getBestJourneys(pt: SharedID): ReturnType<McRAPTOR<TimeVal, V, CA, SharedID, SharedID, number>["getBestJourneys"]> {
    const convertedPt = typeof pt === "string" ? pt : this.data.stopPointerFromId(pt);
    if (convertedPt === undefined) throw new Error(`Unable to retrieve target stop ${pt}`);

    return super.getBestJourneys(convertedPt).map((journeys) => journeys.map((journey) => journey.map(convertBackJourneyStep(this.data.stops))));
  }
}
