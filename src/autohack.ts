import { NS } from '@ns'

/** 
 * @param {Set<string>} seen 
 * @param {Set<string>} searched 
 * */
function selectUnseen(seen: Set<string>, searched: Set<string>) {
    for (const s of seen) {
        if (!searched.has(s)) {
            return s
        }
    }
    return false
}

/** 
 * @param {NS} ns
 * @return {string[]} list of all reachable servers
 */
function findAllServers(ns: NS): string[] {
    ns.disableLog("scan")
    const searched: Set<string> = new Set()
    const seen: Set<string> = new Set()
    seen.add("home")
    let next = selectUnseen(seen, searched)
    while ((next = selectUnseen(seen, searched))) {
        const s = ns.scan(next)
        s.forEach(s => seen.add(s))
        searched.add(next)
        // ns.print(`Found ${s.length} servers connected to ${next}. ${searched.size}/${seen.size} total servers seen.`)
    }
    return [...seen]
}

const SCRIPTS = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"]

/** 
 * @param {NS} ns
 * @return {string[]} list of all known port hacking scripts
 */
function getKnownScripts(ns: NS): string[] {
    return SCRIPTS.filter(script => ns.fileExists(script, "home"))
}

export async function main(ns: NS): Promise<void> {
    const serverNames = findAllServers(ns)

    while (true) {
        ns.print("")
        ns.print((new Date()).toLocaleTimeString())
        const known_scripts = getKnownScripts(ns)

        let servers = serverNames.map(s => ns.getServer(s))
        ns.print(`Total Servers: ${servers.length}`)
        servers = servers.filter(s => s.purchasedByPlayer == false)
        ns.print(`Servers Not Owned: ${servers.length}`)
        servers = servers.filter(s => !s.hasAdminRights)
        ns.print(`Servers Not Pwned: ${servers.length}`)
        const hs = ns.getHackingLevel()
        servers = servers.filter(s => s.requiredHackingSkill <= hs)
        ns.print(`Servers Within Hacking Skill (${hs}): ${servers.length}`)
        servers = servers.filter(s => s.numOpenPortsRequired <= known_scripts.length)
        ns.print(`Servers Within Max Open Ports (${known_scripts.length}): ${servers.length}`)

        const hackableServers = servers.map(s => s.hostname)
        for (const target of hackableServers) {
            if (known_scripts.includes(SCRIPTS[0])) {
                ns.brutessh(target)
            }
            if (known_scripts.includes(SCRIPTS[1])) {
                ns.ftpcrack(target)
            }
            if (known_scripts.includes(SCRIPTS[2])) {
                ns.relaysmtp(target)
            }
            if (known_scripts.includes(SCRIPTS[3])) {
                ns.httpworm(target)
            }
            if (known_scripts.includes(SCRIPTS[4])) {
                ns.sqlinject(target)
            }
            ns.nuke(target)
            if (ns.getServer(target).hasAdminRights) {
                ns.tprint(`New hacked server: ${target}`)
            }
            ns.exec("_setup.js", "home", 1, target)
        }
        await ns.sleep(60000)
    }
}