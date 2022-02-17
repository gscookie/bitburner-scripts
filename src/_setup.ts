import { NS } from '@ns'
import { asStr } from '/lib/util';

const SCRIPT = "_combo.js"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: AutocompleteData, args: string[]): string[] {
    return [...data.servers]
}

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    const target = asStr(ns.args[0]);
    const hackTargets = ns.args.length > 1 ? ns.args.slice(1).map(e => asStr(e)) : [target]
    const numHackTargets = hackTargets.length

    const maxRam = (target != "home" ? ns.getServerMaxRam(target) : ns.getServerMaxRam(target) - ns.getServerUsedRam(target)) / numHackTargets
    if (ns.fileExists(SCRIPT, "home")) {
        if (target != "home") {
            await ns.scp(SCRIPT, target)
        }
        const scriptRam = ns.getScriptRam(SCRIPT, "home")
        const threads = Math.floor(maxRam / scriptRam)
        if (threads > 0) {
            if (target != "home") {
                ns.killall(target)
            }
            for (const hackTarget of hackTargets) {
                ns.exec(SCRIPT, target, threads, hackTarget, threads)
                ns.tprint(`Running ${SCRIPT} against ${hackTarget} on ${target} with ${threads} thread(s).`)
            }
        } else {
            ns.tprint(`Not enough RAM to run ${SCRIPT} on ${target}.`)
        }
    }

}