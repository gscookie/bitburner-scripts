import { NS } from "@ns"
import { asStr, formatTable, indexesUntil } from "/lib/util"

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    const costs = indexesUntil(21).map(i => [
        asStr(i),
        ns.nFormat(Math.pow(2, i + 30), '0 ib').replace('i',''),
        ns.nFormat(ns.getPurchasedServerCost(Math.pow(2, i)), '$0.00a')
    ])
    const table = formatTable(costs, ['size', 'ram', 'cost']).join("\n")
    ns.tprint("Purchased Server Prices:\n"+table)

    if (ns.args[0] == "buy") {
        const name = asStr(ns.args[1])
        const rank = parseInt(asStr(ns.args[2]))
        const cost = ns.nFormat(ns.getPurchasedServerCost(Math.pow(2, rank)), '$0.00a')
        if (await ns.prompt(`Buy "${name}" for ${cost}?`)) {
            const serverName = ns.purchaseServer(name, Math.pow(2, rank))
            ns.tprint(`Purchased "${serverName} for ${cost}.`)
        } else {
            ns.tprint(`Purchase cancelled.`)
        }
    } else {
        ns.tprint(`To purchase a server: run upgrade.js buy <server name> <size (0-20)>`)
    }
}