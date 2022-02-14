import { NS } from '@ns'

/**
 * @param {Set<String>} seen 
 * @param {Set<String>} searched 
 */
 function selectUnseen(seen: Set<string>, searched: Set<string>) {
    for (const s of seen) {
        if (!searched.has(s)) {
            return s
        }
    }
    return false
}

/** @param {NS} ns
 *  @return {String[]} list of all reachable servers
 */
export async function findAllServers(ns: NS): Promise<string[]> {
    ns.disableLog("scan")
    const searched: Set<string> = new Set()
    const seen: Set<string> = new Set()
    seen.add("home")
    let next = selectUnseen(seen, searched)
    while ((next = selectUnseen(seen, searched))) {
        const s = ns.scan(next)
        s.forEach(s => seen.add(s))
        searched.add(next)
    }
    const result = [...seen]

    return result
}
