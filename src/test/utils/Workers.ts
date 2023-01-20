import { Worker } from 'worker_threads'
import { Deferred, rejectCb, resolveCb } from './ultils';
import { Duration } from './benchmark';
import { Queue } from './Queue';
const nsPerMs = BigInt(1e6)

enum Status {
    Idle,
    Busy,
}

interface poolWorker {
    id: number;
    status: Status;
    worker: Worker;
    work: queued | null;
}

type queued = [any, resolveCb<any>, rejectCb];

export class WorkerPool<Icb extends (...args: any[]) => any> {

    readonly script: string;
    readonly size: number;
    readonly pool: poolWorker[];
    readonly queue: Queue<queued>;

    constructor(script: string, size: number, initData?: Parameters<Icb>[0]) {

        this.script = script;
        this.size = size;
        this.pool = new Array(this.size);
        this.queue = new Queue();

        for (let i = 0; i < this.size; i++) {

            this.pool[i] = {
                id: i,
                status: Status.Idle,
                worker: new Worker(this.script),
                work: null,
            };

            if (initData) {
                const worker = this.pool[i];
                worker.status = Status.Busy;

                console.log(`Initializing worker ${worker.id}`);

                worker.worker.postMessage({ ...initData });
                worker.worker.once('message', (v) => {
                    if (v === true) {
                        worker.status = Status.Idle;

                        console.log(`Initialized worker ${worker.id}`);

                        this.runCallback();
                    }
                });
                worker.worker.once('error', console.error);
            }

        }
    }

    run<F extends (...args: any) => any>(data: Parameters<F>, res: resolveCb<ReturnType<F>>, rej: rejectCb): void
    run<F extends (...args: any) => any>(data: Parameters<F>): Promise<Awaited<ReturnType<F>>>
    async run<F extends (...args: any) => any>(data: Parameters<F>, res?: resolveCb<Awaited<ReturnType<F>>>, rej?: rejectCb) {

        let def: Deferred<ReturnType<F>> | null = null;
        let resolve: resolveCb<Awaited<ReturnType<F>>>;
        let reject: rejectCb;

        if (!res || !rej) {
            def = new Deferred<ReturnType<F>>();
            resolve = def.resolve;
            reject = def.reject;
        } else {
            resolve = res;
            reject = rej;
        }

        const job: queued = [data, resolve, reject];

        const worker = this.getIdleWorker();
        if (!worker) {
            this.queue.enqueue(job)
            console.log(`Delayed, queued (${this.queue.size})`);
            return def?.promise;
        }

        console.log(`Running worker ${worker.id} (${this.queue.size})`);

        worker.status = Status.Busy;
        worker.work = job;

        const startTime = process.hrtime.bigint();
        worker.worker.postMessage(data);

        const onceMessage = (result: any) => {
            const delta = new Duration(Number((process.hrtime.bigint() - startTime) / nsPerMs));
            worker.status = Status.Idle;
            resolve(result);
            console.log(`Finished worker ${worker.id} after ${delta.totalSeconds}s${delta.rSeconds} (${this.queue.size})`);
            this.runCallback();
            worker.worker.removeListener('message', onceMessage);
            worker.worker.removeListener('error', onceError);
        };
        const onceError = (err: any) => {
            worker.status = Status.Idle;
            reject(err);
            console.log(`Finished worker ${worker.id} (${this.queue.size})`);
            this.runCallback();
            worker.worker.removeListener('error', onceError);
            worker.worker.removeListener('message', onceMessage);
        };

        worker.worker.once('message', onceMessage);
        worker.worker.once('error', onceError);

        if (!res || !rej) return def!.promise
    }

    protected runCallback(job?: queued) {

        if (!job) {
            if (!this.queue.size) return;
            job = this.queue.dequeue();
        }
        return this.run(...job);

    }

    protected getIdleWorker(): poolWorker | undefined {

        return this.pool.find(w => w.status === Status.Idle);

    }

}