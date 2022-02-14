import { NS, Server } from '@ns'
import { Metric, MetricsEmitter } from '/lib/metrics'
import { findAllServers } from '/lib/servers'
import { asStr } from '/lib/util'

function toAttributes(s: Server): { [k: string]: string } {
    return {
        hostname: s.hostname,
        purchasedByPlayer: asStr(s.purchasedByPlayer),
        backdoorInstalled: asStr(s.backdoorInstalled),
        hasAdminRights: asStr(s.hasAdminRights),
    }
}

function getMoneySource(): {[k: string]: string } {
    const findProp = (propName: string) => {
        for (const div of eval("document").querySelectorAll("div")) {
            const propKey = Object.keys(div)[1];
            if (!propKey) continue;
            const props = div[propKey];
            if (props.children?.props && props.children.props[propName]) return props.children.props[propName];
            if (props.children instanceof Array) for (const child of props.children) if (child?.props && child.props[propName]) return child.props[propName];
        }
    }

    try {
        const rawPlayer = findProp("player")
        return rawPlayer["moneySourceA"].toJSON().data
    } catch(ex: unknown) {
        return {}
    }
}

export async function main(ns: NS): Promise<void> {
    ns.disableLog("getServerSecurityLevel")
    const metrics = new MetricsEmitter(ns)
    const serverNames = await findAllServers(ns)
    let lastLoop: number = Date.now()
    
    while (true) {
        ns.print(`INFO [${(new Date()).toLocaleTimeString()}] Actually slept for ${Date.now() - lastLoop}ms`)
        lastLoop = Date.now()
        const serverStats = serverNames.map(s => ns.getServer(s))
        const serverMetrics = serverStats.map(s => [
            new Metric('server.maxMoney', s.moneyMax, toAttributes(s)),
            new Metric('server.moneyAvailable', s.moneyAvailable, toAttributes(s)),
            new Metric('server.minDifficulty', s.minDifficulty, toAttributes(s)),
            new Metric('server.hackDifficulty', s.hackDifficulty, toAttributes(s)),
            new Metric('server.serverGrowth', s.serverGrowth, toAttributes(s)),
            new Metric('server.securityLevel', ns.getServerSecurityLevel(s.hostname), toAttributes(s)),
            new Metric('server.maxRam', s.maxRam, toAttributes(s)),
            new Metric('server.ramUsed', s.ramUsed, toAttributes(s)),
            new Metric('server.cpuCores', s.cpuCores, toAttributes(s))
        ]).flat()
        metrics.emitAll(serverMetrics).then(() => ns.print(`EMIT [${(new Date()).toLocaleTimeString()}] -- SUCCESS: Emitted ${serverMetrics.length} metrics.`)).catch(() => ns.print("ERR -- Exception emitting server metrics."))
        ns.print(`INFO [${(new Date()).toLocaleTimeString()}] -- Submitted ${serverMetrics.length} server metrics.`)

        const player = ns.getPlayer()
        const rawPlayerMoneySource = getMoneySource()

        const playerMetrics = [
            ["hacking", player.hacking],
            ["hacking_exp", player.hacking_exp],
            ["money", player.money],
        ].map(k => new Metric(`player.${k[0]}`, k[1] as number, {})).concat([
            new Metric('player.serversOwned', ns.getPurchasedServers().length, {}),
            new Metric('player.serversPwned', serverStats.filter(s => !s.purchasedByPlayer && s.hasAdminRights).length, {}),
        ]).concat(Object.entries(rawPlayerMoneySource).map(e => new Metric('player.moneyEarnedSinceLastAugmentation', parseInt(e[1]), {incomeSource: e[0]})))
        metrics.emitAll(playerMetrics).then(() => ns.print(`EMIT [${(new Date()).toLocaleTimeString()}] -- SUCCESS: Emitted ${playerMetrics.length} metrics.`)).catch(() => ns.print("ERR -- Exception emitting player metrics."))
        ns.print(`INFO [${(new Date()).toLocaleTimeString()}] -- Submitted ${playerMetrics.length} player metrics.`)

        ns.print(`     [${(new Date()).toLocaleTimeString()}] -- Awaiting ${metrics.promises.size} promises.`)
        await metrics.awaitAll()
        ns.print(`     [${(new Date()).toLocaleTimeString()}] -- Promises complete. Sleeping...`)

        await ns.sleep(60000 - (Date.now() - lastLoop))
    }
}