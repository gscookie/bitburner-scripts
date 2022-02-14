import { NS } from '@ns'
import { findAllServers } from '/lib/servers'
import { asStr } from '/lib/util'

const specialCases = ["all", "backdoor"]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return [...data.servers].concat(specialCases)
}

function selectUnseen(all: string[], seen: Set<string>) {
    for (const s of all) {
        if (!seen.has(s)) {
            return s
        }
    }
    return false
}

export async function main(ns: NS): Promise<void> {
    const target = asStr(ns.args[0])
    const servers = await findAllServers(ns)

    if (!servers.includes(target) && !specialCases.includes(target)) {
        ns.tprint(`ERROR - No route to '${target}'.`)
        ns.exit()
    }

    const edges = Object.fromEntries(servers.map(s => [s, ns.scan(s)]))
    const routes = Object.fromEntries(edges["home"].map(s => [s, ["home", s]]))
    const scanned = new Set(["home"])
    let next: string | false;
    let bailCounter = 0
    while ((next = selectUnseen(Object.keys(routes), scanned)) != false) {
        if (bailCounter++ > 10000) {
            ns.tprint(`Bailed after ${bailCounter}!\nnext: ${next}\nscanned:${[...scanned.values()].join(",")}\nroutes:${routes}`)
            ns.exit()
        }
        const nextScan = ns.scan(next)
        const routeToNext = routes[asStr(next)]
        nextScan.filter(s => !Object.keys(routes).includes(s)).forEach(s => {
            const host = s
            const route = routeToNext.concat([host])
            routes[host] = route
        })
        scanned.add(next)
    }

    if (target == "all") {
        for (const route in routes) {
            ns.print(`${route} (${routes[route].length - 1}): [${routes[route]}]`)
        }
        ns.tprint("All routes printed to script logs.")
    } else {
        const cmd = target == "backdoor" ? ";backdoor" : (ns.args.length > 1 ? `;${ns.args[1]}` : "")
        const finalTarget = target != "backdoor" ? target : servers.map(s => ns.getServer(s)).filter(s => !s.backdoorInstalled && s.hasAdminRights && !s.purchasedByPlayer)[0]?.hostname
        if(!finalTarget) {
            ns.tprint("Nothing to do. All pwned servers have backdoors.")
            ns.exit()
        }
        if(target == "backdoor") {
            ns.tprint(`Next Backdoor Target: ${finalTarget}`)
        }
        const route = routes[finalTarget]
        ns.tprint(`target: ${finalTarget}, distance: ${route.length - 1} hops, route: [${route}]`)
        const fullCmd = route.slice(1).map(h => `connect ${h}`).join(";") + cmd
        ns.tprint("INFO [Copied to Clipboard!]")
        ns.tprint("INFO cmd: "+fullCmd)
        await navigator.clipboard.writeText(fullCmd)
    }
}