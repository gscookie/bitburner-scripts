import { NS } from '@ns'
import { findAllServers } from 'lib/servers'
import { formatTable } from '/lib/util'

export async function main(ns: NS): Promise<void> {
    const servers = await findAllServers(ns)
    const allServers = servers.map(s => ns.getServer(s))
    const pwnedServers = allServers.filter(s => s.hasAdminRights && s.purchasedByPlayer == false)
    ns.tprint("Pwned Servers (by max money):\n" + formatTable(
        pwnedServers.sort((a, b) => b.moneyMax - a.moneyMax)
            .map(s => [
                s.hostname,
                ns.nFormat(s.minDifficulty, '0'),
                ns.nFormat(s.hackDifficulty, '0'),
                ns.nFormat(s.moneyAvailable, '$0.00a'),
                ns.nFormat(s.moneyMax, '$0.00a'),
                s.moneyMax > 0 ? ns.nFormat(s.moneyAvailable / s.moneyMax, '0.0%') : 'N/A',
                ns.nFormat(s.serverGrowth, '0'),
                1 / ns.hackAnalyze(s.hostname),
                s.moneyMax > 0  && false ? ns.growthAnalyze(s.hostname, s.moneyMax / Math.max(s.moneyAvailable + 1), 1) : 'N/A',
                ns.nFormat(s.moneyMax * s.serverGrowth * (s.moneyAvailable / s.moneyMax), '0.0a')
            ]),
            ['hostname', 'min', 'sec', 'avail', 'max', 'growth', 'rating', 'tConsume']
    ).join("\n"))
}