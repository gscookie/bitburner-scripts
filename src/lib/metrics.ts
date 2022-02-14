import { asStr } from "/lib/util"

export class Metric {
    name: string;
    type: string;
    value: number;
    timestamp: number;
    attributes: { [k: string]: string }

    constructor(name: string, value: number, attributes: { [k: string]: string}) {
        this.name = name
        this.value = value
        this.type = "gauge"
        this.timestamp = Date.now()
        this.attributes = attributes || {}
    }
}

export class MetricsEmitter {
    apiKey: string;
    promises: Set<Promise<void>>;
    ns: NS;

    constructor(ns: NS) {
        this.ns = ns
        this.apiKey = asStr(ns.read('/secrets/newrelic.txt'))
        this.promises = new Set()
    }

    async emitAll(metrics: Metric[]): Promise<void> {
        const body = [{ metrics: metrics }]
        const request = fetch('https://metric-api.newrelic.com/metric/v1', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'Api-Key': this.apiKey
            },
            body: JSON.stringify(body)
        }).then(() => this.ns.print(`EMIT [${(new Date()).toLocaleTimeString()}] ${metrics.length} metrics.`))
        this.promises.add(request)
    }

    async emit(metric: Metric): Promise<void> {
        await this.emitAll([metric])
    }

    async awaitAll(): Promise<void> {
        while(this.promises.size > 0) {
            const promise = this.promises.values().next().value
            await promise
            this.promises.delete(promise)
        }
    }
}