export async function benchmark<returnType>(f: (...args: any[]) => returnType, args: any[] = [], times: number = 1) {
    const starts: number[] = new Array(times);
    const ends: number[] = new Array(times);
    let lastReturn: Awaited<returnType> | null = null;
    for (let i = 0; i < times; i++) {
        starts[i] = performance.now();
        lastReturn = await f(...args);
        ends[i] = performance.now();
    };
    const durations = ends.map((e, i) => new Duration(e - starts[i]))
    const totalDuration = new Duration(durations.reduce((acc, v) => acc + v.ms, 0));
    return {
        fName: f.name,
        args,
        starts,
        ends,
        durations,
        totalDuration,
        averageDuration: new Duration(totalDuration.ms / times),
        times,
        lastReturn,
    };
};

export class Duration {

    private time: number;

    constructor(ms: number) {

        this.time = ms;

    }

    get ms() {
        return this.time;
    }

    set ms(ms: number) {
        this.time = ms;
    }

    get totalSeconds() {
        return Math.floor(this.time / 1000);
    }

    get rSeconds() {
        return this.time % 1000;
    }

    get totalMinuts() {
        return Math.floor(this.time / 60000);
    }

    get rMinuts() {
        return this.time % 60000;
    }

}