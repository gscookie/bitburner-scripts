import { NS } from '@ns'
import { asStr } from '/lib/util'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: AutocompleteData, args: string[]): string[] {
    return [...data.servers]
}

export async function main(ns: NS): Promise<void> {
    const target = asStr(ns.args[0] || "home")
    const pidList = ns.ps(target).map(p => p.pid)
    let taskCount: number;
    while ((taskCount = ns.ps(target).filter(p => pidList.includes(p.pid)).length) > 0) {
        ns.print(`[${(new Date()).toLocaleTimeString()}] ${taskCount} running scripts on ${target}`)
        await ns.sleep(5000)
    }
    ns.tprint(`SUCCESS [${(new Date()).toLocaleTimeString()}] Running tasks on ${target} have completed.`)
}