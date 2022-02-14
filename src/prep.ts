import { NS, Server } from '@ns'
import { GlobalCache } from '/lib/cache'
import { msToTime } from '/lib/util'

const WEAKEN_SCRIPT = "_weakenonce.js"
const GROW_SCRIPT = "_growonce.js"

function findNextTarget(ns: NS, gc: GlobalCache, exclude: string[], mode: "weaken" | "grow"): Server | undefined {
    let sortFunc: (a: Server, b: Server) => number;
    let filterFunc: (s: Server) => boolean;

    if (mode == "weaken") {
        sortFunc = (a: Server, b: Server) => ns.getWeakenTime(b.ip) - ns.getWeakenTime(a.ip)
        filterFunc = (s: Server) => s.hackDifficulty > s.minDifficulty
    } else if (mode == "grow") {
        sortFunc = (a: Server, b: Server) => ns.getGrowTime(b.ip) - ns.getGrowTime(a.ip)
        filterFunc = (s: Server) => s.moneyAvailable < s.moneyMax
    } else {
        throw 'Invalid mode!'
    }


    const validTargets = gc.serverList.filter(s => !s.purchasedByPlayer && s.hasAdminRights && !exclude.includes(s.hostname) && filterFunc(s)).sort(sortFunc)
    return validTargets.length > 0 ? validTargets[0] : undefined
}

function getLocalRam(ns: NS): number {
    return ns.getServerMaxRam(ns.getHostname()) - ns.getServerUsedRam(ns.getHostname())
}

function cullRunning(ns: NS, runningScripts: { [k: string]: number }) {
    for (const targetName of Object.keys(runningScripts)) {
        if (!ns.isRunning(runningScripts[targetName], ns.getHostname())) {
            delete runningScripts[targetName]
        }
    }
    return runningScripts
}

export async function main(ns: NS): Promise<void> {
    ns.disableLog("getServerMaxRam")
    ns.disableLog("getServerUsedRam")
    ns.disableLog("getServerMaxMoney")
    ns.disableLog("getServerMoneyAvailable")
    ns.disableLog("sleep")

    let cache: GlobalCache;
    let target: Server | undefined;
    const scriptSize = Math.max(ns.getScriptRam(WEAKEN_SCRIPT), ns.getScriptRam(GROW_SCRIPT))

    const runningScripts: { [k: string]: number } = {}
    let etc: number = Date.now()

    let weakenDone = false
    let growDone = false
    let scriptsDone = false

    while (!(weakenDone && growDone && scriptsDone)) {

        if ((target = findNextTarget(ns, (cache = GlobalCache.load(ns)), Object.keys(runningScripts), "weaken")) !== undefined) {
            const threadsRequired = Math.ceil((target.hackDifficulty - target.minDifficulty) / 0.05)
            const localRam = getLocalRam(ns)
            const threads = (localRam > (scriptSize * threadsRequired)) ? threadsRequired : Math.floor(localRam / scriptSize)

            let pid = 0
            if (threads > 0 && !ns.isRunning(WEAKEN_SCRIPT, ns.getHostname(), target.hostname)) {
                pid = ns.run(WEAKEN_SCRIPT, threads, target.hostname)
                const thisEtc = ns.getWeakenTime(target.hostname) + Date.now()
                if (pid > 0 && thisEtc > etc) {
                    etc = thisEtc
                }
            }

            if (pid > 0) {
                runningScripts[target.hostname] = pid
            }

            weakenDone = false
        } else {
            weakenDone = true
        }


        if (weakenDone && ((target = findNextTarget(ns, (cache = GlobalCache.load(ns)), Object.keys(runningScripts), "grow")) !== undefined)) {
            const threadsRequired = ns.growthAnalyze(target.hostname, Math.max(1,ns.getServerMaxMoney(target.ip) - ns.getServerMoneyAvailable(target.ip)))
            const localRam = getLocalRam(ns)
            const threads = (localRam > (scriptSize * threadsRequired)) ? threadsRequired : Math.floor(localRam / scriptSize)

            let pid = 0
            if (threads > 0 && !ns.isRunning(GROW_SCRIPT, ns.getHostname(), target.hostname)) {
                pid = ns.run(GROW_SCRIPT, threads, target.hostname)
                const thisEtc = ns.getGrowTime(target.hostname) + Date.now()
                if (pid > 0 && thisEtc > etc) {
                    etc = thisEtc
                }
            }

            if (pid > 0) {
                runningScripts[target.hostname] = pid
            }

            growDone = false
        } else {
            growDone = true
        }

        scriptsDone = Object.keys(cullRunning(ns, runningScripts)).length > 0
        const sleepTime = (weakenDone && growDone) ? 10000 : 500
        ns.print(`INFO [${(new Date()).toLocaleTimeString()}] Waiting for ${Object.keys(runningScripts).length} script(s) to complete. ETC: ${msToTime(etc - Date.now())} @ ${(new Date(etc)).toLocaleTimeString()}`)
        await ns.sleep(sleepTime)
    }

    ns.tprint('SUCCESS -- prep.js is complete.')
    ns.print(JSON.stringify(runningScripts))


}