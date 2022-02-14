import { NS, Player, Server } from '@ns'
import { findAllServers } from '/lib/servers';
import { formatTable, msToTime, asStr } from '/lib/util';
import { GlobalCache, AnalyzeStats, CACHE_FILENAME } from '/lib/cache';

export const ANALYZE_CACHE_FILENAME = "/cache/globalCacheAnalyze.txt"

/**
 * Returns the number of "growth cycles" needed to grow the specified server by the
 * specified amount.
 * @param server - Server being grown
 * @param growth - How much the server is being grown by, in DECIMAL form (e.g. 1.5 rather than 50)
 * @param p - Reference to Player object
 * @returns Number of "growth cycles" needed
 */
function numCycleForGrowth(server: Server, growth: number, p: Player, cores = 1): number {
    let ajdGrowthRate = 1 + (1.003 - 1) / server.hackDifficulty;
    if (ajdGrowthRate > 1.0035) {
        ajdGrowthRate = 1.0035;
    }

    const serverGrowthPercentage = server.serverGrowth / 100;

    const coreBonus = 1 + (cores - 1) / 16;
    const cycles =
        Math.log(growth) /
        (Math.log(ajdGrowthRate) *
            p.hacking_grow_mult *
            serverGrowthPercentage *
            1 * // BitNodeMultipliers.ServerGrowthRate
            coreBonus);

    return cycles;
}

function calcGrowthThreads(ns: NS, s: Server, p: Player): number {
    return numCycleForGrowth(s, s.moneyMax, p, 1)
    let guess = s.moneyMax / 2
    let tries = 0
    let growth = 0
    while (tries < 100 && guess >= 1 && (growth = ns.formulas.hacking.growPercent(s, guess, p, 1)) > s.moneyMax) {
        ns.print(`Guessing (${tries}): ${guess} Growth: ${ns.nFormat(growth, '0.00a')} Expected: ${ns.nFormat(s.moneyMax, '0.00a')} Error: ${growth - s.moneyMax}`)
        guess = guess * (s.moneyMax / growth)
        tries++
    }
    return guess == 0 ? -1 : guess + 1
}

function deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T
}

function buildAnalyzeStats(ns: NS, s: Server, p: Player, formulasEnabled: boolean): AnalyzeStats {
    ns.print("Analyzing " + s.hostname + ((formulasEnabled) ? " with Formulas.exe." : " experimentally."))

    if (formulasEnabled) {
        s.hackDifficulty = s.minDifficulty
        s.moneyAvailable = s.moneyMax
        p.hacking = Math.max(p.hacking, s.requiredHackingSkill)
    }

    const hackAnalyze = formulasEnabled ? ns.formulas.hacking.hackPercent(s, p) : ns.hackAnalyze(s.ip)
    const hackAnalyzeChance = formulasEnabled ? ns.formulas.hacking.hackChance(s, p) : ns.hackAnalyzeChance(s.ip)
    const hackAnalyzeThreads = formulasEnabled ? Math.max(1, Math.ceil(1.0 / hackAnalyze)) : Math.ceil(ns.hackAnalyzeThreads(s.ip, s.moneyAvailable))
    const hackAnalyzeSecurity = ns.hackAnalyzeSecurity(hackAnalyzeThreads)
    const growthAnalyzeThreads = formulasEnabled ? calcGrowthThreads(ns, s, p) : Math.ceil(ns.growthAnalyze(s.ip, Math.max(0, s.moneyMax), 1))
    const growthAnalyzeSecurity = ns.growthAnalyzeSecurity(growthAnalyzeThreads)
    const weakenHackThreads = Math.ceil(hackAnalyzeSecurity / 0.05)
    const weakenGrowthThreads = Math.ceil(growthAnalyzeThreads / 0.05)
    const hackTime = formulasEnabled ? ns.formulas.hacking.hackTime(s, p) : ns.getHackTime(s.ip)
    const growTime = formulasEnabled ? ns.formulas.hacking.growTime(s, p) : ns.getGrowTime(s.ip)
    const postGrowServer = deepCopy(s)
    postGrowServer.hackDifficulty = Math.min(s.minDifficulty + growthAnalyzeSecurity, 100)
    const weakenGrowTime = formulasEnabled ? ns.formulas.hacking.weakenTime(postGrowServer, p) : ns.getWeakenTime(s.ip)
    const postHackServer = deepCopy(s)
    postHackServer.hackDifficulty = Math.min(s.minDifficulty + hackAnalyzeSecurity, 100)
    const weakenHackTime = formulasEnabled ? ns.formulas.hacking.weakenTime(postHackServer, p) : ns.getWeakenTime(s.ip)
    const totalTime = hackTime + growTime + weakenGrowTime + weakenHackTime
    const maxStepTime = Math.max(hackTime, growTime, weakenGrowTime, weakenHackTime)
    const totalThreads = hackAnalyzeThreads + growthAnalyzeThreads + weakenGrowthThreads + weakenHackThreads
    const maxStepThreads = Math.max(hackAnalyzeThreads, growthAnalyzeThreads, weakenGrowthThreads, weakenHackThreads)
    const cashPerThread = s.moneyMax / totalThreads
    const cashPerSec = s.moneyMax / (totalTime / 1000)
    const cashPerThreadSec = s.moneyMax / (totalThreads * totalTime / 1000)
    const cashPerBatchSec = s.moneyMax / maxStepTime

    ns.print(`ha: ${ns.nFormat(hackAnalyze, '0.0a')} hat: ${hackAnalyzeThreads}`)

    return {
        hostname: s.hostname,
        hackAnalyze: hackAnalyze,
        hackAnalyzeChance: hackAnalyzeChance,
        hackAnalyzeThreads: hackAnalyzeThreads,
        hackAnalyzeSecurity: hackAnalyzeSecurity,
        growthAnalyzeThreads: growthAnalyzeThreads,
        growthAnalyzeSecurity: growthAnalyzeSecurity,
        weakenHackThreads: weakenHackThreads,
        weakenGrowthThreads: weakenGrowthThreads,
        hackTime: hackTime,
        growTime: growTime,
        weakenGrowTime: weakenGrowTime,
        weakenHackTime: weakenHackTime,
        totalTime: totalTime,
        maxStepTime: maxStepTime,
        totalThreads: totalThreads,
        maxStepThreads: maxStepThreads,
        totalMoney: s.moneyMax,
        cashPerThread: cashPerThread,
        cashPerSec: cashPerSec,
        cashPerThreadSec: cashPerThreadSec,
        cashPerBatchSec: cashPerBatchSec,
        exact: formulasEnabled
    }

}

function readAnalyzeStats(ns: NS): AnalyzeStats[] {
    if (!ns.fileExists(ANALYZE_CACHE_FILENAME)) {
        return []
    }
    return JSON.parse(ns.read(ANALYZE_CACHE_FILENAME)) as AnalyzeStats[]
}

async function writeAnalyzeStats(ns: NS, stats: AnalyzeStats[]): Promise<void> {
    await ns.write(ANALYZE_CACHE_FILENAME, JSON.stringify(stats), "w")
}

const exactAS: { [k: string]: AnalyzeStats } = {}

async function updateCache(ns: NS) {
    const startTime = Date.now()
    const player = ns.getPlayer()
    const serverNames = await findAllServers(ns)
    const serverList = serverNames.map(s => ns.getServer(s))

    const formulasEnabled = isFormulasEnabled(ns)
    const baseFilter = (s: Server) => (!s.purchasedByPlayer && s.moneyMax > 100 /* && formulasEnabled */ && s.hasAdminRights)
    const analyzeFilter = (s: Server) => (/* formulasEnabled || */ (s.hasAdminRights && (s.moneyAvailable == s.moneyMax) && (s.hackDifficulty == s.minDifficulty)))

    const newAnalyzedStats = serverList.filter(s => baseFilter(s) && analyzeFilter(s))
        .map(s => buildAnalyzeStats(ns, s, player, false))
    const newAnalyzedServers = newAnalyzedStats.map(as => as.hostname)
    if (formulasEnabled) {
        newAnalyzedServers.forEach(s => { exactAS[s] = buildAnalyzeStats(ns, ns.getServer(s), player, true) })
    }
    const analyzeStats = readAnalyzeStats(ns).filter(s => !newAnalyzedServers.includes(s.hostname)).concat(newAnalyzedStats)

    await writeAnalyzeStats(ns, analyzeStats)
    const asEligibleCount = serverList.filter(s => baseFilter(s)).length
    const asCount = analyzeStats.length
    const asPct = ns.nFormat(asCount / asEligibleCount, '0%')

    const gc = new GlobalCache(serverList, player, Date.now(), analyzeStats)
    const cacheTime = Date.now()
    await ns.write(CACHE_FILENAME, JSON.stringify(gc.toJSON()), "w")
    for (const server of serverList) {
        if (server.hostname == "home") { continue; }
        await ns.scp(CACHE_FILENAME, server.ip)
    }
    const endTime = Date.now()
    ns.print(`INFO [${(new Date()).toLocaleTimeString()}] Updated global cache to ${serverList.length} servers in ${endTime - startTime}ms. [update:${cacheTime - startTime}ms, scp:${endTime - cacheTime}ms] Analysis Progress: ${asCount}/${asEligibleCount} (${asPct})`)

}

function formatRatios(as: AnalyzeStats, mini = false): string {
    const ht = as.hackAnalyzeThreads
    const gt = as.growthAnalyzeThreads
    const wt = as.weakenGrowthThreads + as.weakenHackThreads
    const d = mini ? ht : 1
    return `[${Math.ceil(ht / d)}:${Math.ceil(gt / d)}:${Math.ceil(wt / d)}]`
}

function isFormulasEnabled(ns: NS): boolean {
    return ns.fileExists("Formulas.exe", "home")
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: AutocompleteData, args: string[]): string[] {
    if (args.length == 1) {
        return ["mini", "dump", "compare"]
    } else {
        return [...data.servers]
    }
}

export async function main(ns: NS): Promise<void> {
    if (ns.args[0] == 'dump') {
        const as = readAnalyzeStats(ns)
        const table = formatTable(as.map(a => Object.values(a)), Object.keys(as[0])).join("\n")
        ns.tprint("Global Analyze Cache:\n" + table)
        ns.exit()
    } else if (ns.args[0] == 'mini') {
        const as = readAnalyzeStats(ns).sort((a, b) => b.cashPerThreadSec - a.cashPerThreadSec)
        const table = formatTable(as.map(a => [
            a.hostname,
            (a.weakenHackThreads + a.weakenGrowthThreads + a.hackAnalyzeThreads + a.growthAnalyzeThreads),
            formatRatios(a, false),
            formatRatios(a, true),
            ns.nFormat(a.cashPerSec, '$0.00a'),
            ns.nFormat(a.cashPerThread, '$0.00a'),
            ns.nFormat(a.cashPerThreadSec, '$0.00a'),
            msToTime(a.totalTime),
            ns.nFormat(a.totalMoney, '$0.00a'),
            ns.getServerMinSecurityLevel(a.hostname),
            ns.getServerGrowth(a.hostname)
        ]).concat(["-".repeat(9).split(""), [
            "TOTAL",
            as.map(a => a.totalThreads).reduce((a, b) => a + b),
            "N/A",
            "N/A",
            ns.nFormat(as.map(a => a.cashPerSec).reduce((a, b) => a + b) / as.length, '$0.00a'),
            ns.nFormat(as.map(a => a.cashPerThread).reduce((a, b) => a + b) / as.length, '$0.00a'),
            ns.nFormat(as.map(a => a.cashPerThreadSec).reduce((a, b) => a + b) / as.length, '$0.00a'),
            msToTime(as.map(a => a.totalTime).reduce((a, b) => a + b) / as.length),
            ns.nFormat(as.map(a => a.totalMoney).reduce((a, b) => a + b), '$0.00a'),
            "N/A",
            "N/A"
        ]]), ["hostname", "totalThreads", "[h:g:w]", "[1:g:w]", "$/s", "$/t", "$/ts", "tTime", "t$", "minD", "growth"]).join("\n")
        ns.tprint("Global Analyze Cache:\n" + table)
        ns.exit()
    } else if (ns.args[0] == 'compare') {
        const target = asStr(ns.args[1])
        const as = readAnalyzeStats(ns)
        const asExperiment = as.filter(s => s.hostname == target)[0]
        const asFormulas = buildAnalyzeStats(ns, ns.getServer(target), ns.getPlayer(), true)

        const formatCell = function (key: string, value: any, prefix = ''): string {
            if (typeof value !== 'number') {
                return asStr(value)
            } else if (key.startsWith('cash')) {
                return ns.nFormat(value, prefix + '$0.00a')
            } else {
                if (value == 0) { return '0' }
                const format = value < 0.1 ? (value < 0.00001 ? '0.00e+0' : '0.00[0000]') : '0.00a'
                return ns.nFormat(value, prefix + format)
            }
        }

        const values = Object.keys(asExperiment)
            .filter(k => !['hostname', 'exact'].includes(k))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map(k => [k, (asExperiment as { [k: string]: any })[k], (asFormulas as { [k: string]: any })[k]])
            .map(row => [
                row[0] as string,
                formatCell(row[0], row[1]),
                formatCell(row[0], row[2]),
                (row[1] == row[2]) ? 'exact' : formatCell(row[0], row[2] - row[1], ''),
                (row[1] == row[2]) ? 'exact' : ns.nFormat((row[2] - row[1]) / row[1], '+0.00%')
            ])

        const table = formatTable(values, ["key", "value (experimental)", "value (formulas)", "(ex - fo)", "(ex / fo)%"]).join("\n")
        ns.tprint(`Global Analyze Cache:\nComparing '${target}'\n` + table)
        ns.exit()
    }
    ns.disableLog('disableLog')
    ns.disableLog('scp')
    while (true) {
        await updateCache(ns)
        await ns.sleep(10 * 1000)
    }
}