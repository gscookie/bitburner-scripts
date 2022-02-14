import { NS } from '@ns'
import { generateRandomUUID } from '/lib/util';

type WorkFunc = () => Promise<void>
const workBuffer: WorkFunc[] = []

async function postSleep(ns: NS) {
    let nextFunc: WorkFunc | undefined;
    while((nextFunc = workBuffer.shift()) !== undefined) {
        try {
            await nextFunc()
        } catch(ex: unknown) {
            ns.print(`Exception running postSleep work function: ${ex}`)
        }
    }
}

async function localSleep(ns: NS, ms: number) {
    const endTime = Date.now() + ms
    while(Date.now() < endTime) {
        await postSleep(ns)
        await ns.sleep(1000)
    }
}

export async function main(ns: NS): Promise<void> {
    const bc = new BroadcastChannel("test-channel")
    const channelID = `${ns.getScriptName()}-${generateRandomUUID()}`

    ns.atExit(() => bc.close())

    let receivedCount = 0
    bc.onmessage = (ev: MessageEvent<unknown>) => {
        const msgEvent = {
            data: ev.data,
            origin: ev.origin,
            lastEventId: ev.lastEventId,
            source: ev.source,
            ports: ev.ports
        }
        const msg = JSON.stringify(msgEvent)
        workBuffer.push( async () => ns.tprint(`BCMSG: "${msg}"`))
        receivedCount = receivedCount + 1
    }
    while (true) {
        (new BroadcastChannel("test-channel")).postMessage([channelID,`Test Message. Current Time: ${(new Date()).toLocaleTimeString()}`])
        ns.print(`INFO [${(new Date()).toLocaleTimeString()}] Received Count: ${receivedCount}`)
        await ns.sleep(5000)
        await postSleep(ns)
        // await localSleep(5000)
    }
}