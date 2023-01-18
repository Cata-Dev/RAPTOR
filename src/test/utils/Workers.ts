import { Worker } from 'worker_threads'
import { Duration } from './benchmark';
import { Queue } from './Queue';
const nsPerMs = BigInt(1e6)

interface poolWorker {
    id: number;
    status: 'IDLE' | 'BUSY';
    worker: Worker;
    work: queued | null;
}

export type resolveCb = (value: any) => void;
export type rejectCb = (reason?: any) => void;
type queued = [any, resolveCb, rejectCb];

export class WorkerPool {

    readonly script: string;
    readonly size: number;
    readonly pool: poolWorker[];
    readonly queue: Queue<queued>;

    constructor(script: string, size: number, initData?: any) {

        this.script = script;
        this.size = size;
        this.pool = new Array(this.size);
        this.queue = new Queue();

        for (let i = 0; i < this.size; i++) {

            this.pool[i] = {
                id: i,
                status: 'IDLE',
                worker: new Worker(this.script),
                work: null,
            };

            if (initData) {
                const worker = this.pool[i];
                worker.status = 'BUSY';

                console.log(`Initializing worker ${worker.id}`);

                worker.worker.postMessage({ init: true, ...initData });
                worker.worker.once('message', (v) => {
                    if (v === true) {
                        worker.status = 'IDLE';

                        console.log(`Initialized worker ${worker.id}`);

                        this.runCallback();
                    }
                });
                worker.worker.once('error', console.error);
            }

        }
    }

    run<Type>(data: any, res: resolveCb, rej: rejectCb): void
    run<Type>(data: any): Promise<Type>
    run(data: any, res?: resolveCb, rej?: rejectCb) {
        if (res && typeof res == 'function' && rej && typeof rej == 'function') {

            const work: queued = [data, res, rej];

            const worker = this.getIdleWorker();

            console.log(`Running worker ${worker.id} (${this.queue.size})`);

            worker.status = 'BUSY';
            worker.work = work;

            const startTime = process.hrtime.bigint();
            worker.worker.postMessage(data);

            const onceMessage = (result: any) => {
                const delta = new Duration(Number((process.hrtime.bigint()-startTime)/nsPerMs));
                worker.status = 'IDLE';
                res(result);
                console.log(`Finished worker ${worker.id} after ${delta.totalSeconds}s${delta.rSeconds} (${this.queue.size})`);
                this.runCallback();
                worker.worker.removeListener('error', onceError);
            };
            worker.worker.once('message', onceMessage);

            const onceError = (err: any) => {
                worker.status = 'IDLE';
                rej(err);
                console.log(`Finished worker ${worker.id} (${this.queue.size})`);
                this.runCallback();
                worker.worker.removeListener('message', onceMessage);
            };
            worker.worker.once('error', onceError);

        } else return new Promise((res, rej) => {

            const work: queued = [data, res, rej];

            const worker = this.getIdleWorker();
            if (!worker) this.queue.enqueue(work), console.log(`Queued (${this.queue.size})`);
            else {

                console.log(`Running worker ${worker.id} (${this.queue.size})`)

                worker.status = 'BUSY';
                worker.work = work;

                const startTime = process.hrtime.bigint();
                worker.worker.postMessage(data);

                const onceMessage = (result: any) => {
                    const delta = new Duration(Number((process.hrtime.bigint()-startTime)/nsPerMs));
                    worker.status = 'IDLE';
                    res(result);
                    console.log(`Finished worker ${worker.id} after ${delta.totalSeconds}s${delta.rSeconds} (${this.queue.size})`);
                    this.runCallback();
                    worker.worker.removeListener('error', onceError);
                };
                worker.worker.once('message', onceMessage);
    
                const onceError = (err: any) => {
                    worker.status = 'IDLE';
                    rej(err);
                    console.log(`Finished worker ${worker.id} (${this.queue.size})`);
                    this.runCallback();
                    worker.worker.removeListener('message', onceMessage);
                };
                worker.worker.once('error', onceError);

            }

        })
    }

    protected runCallback(): void {
        
        if (!this.queue.size) return;
        const nextQueued = this.queue.dequeue();
        this.run(...nextQueued);

    }

    protected getIdleWorker(): poolWorker | undefined {

        return this.pool.find(w => w.status === 'IDLE');

    }

}