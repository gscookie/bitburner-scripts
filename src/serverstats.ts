import { NS, Server } from '@ns'
import { findAllServers } from 'lib/servers'
import { main as lsMain } from 'optimalThreadTest'
let _NS: NS | undefined = undefined


const SCRIPTS = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"]

/** @param {NS} ns
 *  @return {String[]} list of all known port hacking scripts
 */
function getKnownScripts(ns: NS): string[] {
    return SCRIPTS.filter(script => ns.fileExists(script, "home"))
}

function format_money(num: number): string {
    if (_NS === undefined) { throw '_NS used before initialization!' }

    return _NS.nFormat(num, '$0.00a')
}

/** 
 *  @param {Server[]} serverList
 *  **/
function findAllFiles(serverList: Server[]): { [key: string]: string[] } {
    if (_NS === undefined) { throw '_NS used before initialization!' }

    const files: { [key: string]: string[] } = {}
    for (const server of serverList) {
        files[server.hostname] = _NS.ls(server.hostname)
    }
    return files
}

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    _NS = ns
    const serverNames = await findAllServers(ns)

    const showFilesOption = ns.args.includes('files')
    const showServersOption = ns.args.includes('ls')



    ns.print("")
    ns.tprint((new Date()).toLocaleTimeString())
    const known_scripts = getKnownScripts(ns)

    const allServers = serverNames.map(s => ns.getServer(s))
    ns.tprint(`Total Servers: ${allServers.length}`)
    let servers = allServers.filter(s => s.purchasedByPlayer == false)
    const ownedServers = allServers.filter(s => s.purchasedByPlayer == true)
    ns.tprint(`Servers Not Owned: ${servers.length}`)
    const pwnedServers = servers.filter(s => s.hasAdminRights)
    servers = servers.filter(s => !s.hasAdminRights)
    ns.tprint(`Servers Not Pwned: ${servers.length}`)
    const hs = ns.getHackingLevel()
    const nextHack = servers.filter(s => s.requiredHackingSkill > hs).sort((a, b) => a.requiredHackingSkill - b.requiredHackingSkill)[0]
    servers = servers.filter(s => s.requiredHackingSkill <= hs)
    ns.tprint(`Servers Within Hacking Skill (${hs}): ${servers.length}`)
    ns.tprint(`  Next: ${nextHack.hostname} @ ${nextHack.requiredHackingSkill}`)
    servers = servers.filter(s => s.numOpenPortsRequired <= known_scripts.length)
    ns.tprint(`Servers Within Max Open Ports (${known_scripts.length}): ${servers.length}`)
    ns.tprint(`  [${servers.map(s => s.hostname)}]`)

    const ownedServerRam = ownedServers.map(s => s.maxRam).reduce((a, b) => a + b, 0)
    ns.tprint(`Owned Servers: ${ownedServers.length} [Total RAM: ${ownedServerRam}]`)
    const pwnedServerRam = pwnedServers.map(s => s.maxRam).reduce((a, b) => a + b, 0)
    ns.tprint(`Pwned Servers: ${pwnedServers.length} [Total RAM: ${pwnedServerRam}]`)
    const pwnedServerSec = pwnedServers.map(s => s.hackDifficulty).reduce((a, b) => a + b)
    const pwnedServerMinSec = pwnedServers.map(s => s.minDifficulty).reduce((a, b) => a + b)
    ns.tprint(`  Security [Raw]: ${ns.nFormat(pwnedServerSec, '0.0')}/${pwnedServerMinSec}`)
    const pwnedServerWeakened = pwnedServers.filter(s => s.hackDifficulty <= (s.minDifficulty * 1.05)).length
    ns.tprint(`  Security [<5%]: ${pwnedServerWeakened}/${pwnedServers.length}`)
    const pwnedServersCash = pwnedServers.map(s => s.moneyAvailable).reduce((a, b) => a + b)
    const pwnedServersCashMax = pwnedServers.map(s => s.moneyMax).reduce((a, b) => a + b)
    const pwnedServersGrown = pwnedServers.filter(s => s.moneyAvailable >= (s.moneyMax * 0.95))
    const pwnedServersGrownCash = pwnedServersGrown.map(s => s.moneyAvailable).reduce((a, b) => a + b, 0)
    ns.tprint(`  Growth [Raw]: ${format_money(pwnedServersCash)}/${format_money(pwnedServersCashMax)} (${Math.round(100.0 * pwnedServersCash / pwnedServersCashMax)}%)`)
    ns.tprint(`  Growth [95%]: ${pwnedServersGrown.length}/${pwnedServers.length} (Available: ${format_money(pwnedServersGrownCash)})`)
    ns.tprint(`    [${pwnedServersGrown.map(s => s.hostname)}]`)
    const pwnedServersOrphans = pwnedServers.filter(s => s.maxRam == 0).map(s => s.hostname)
    ns.tprint(`    Orphans: [${pwnedServersOrphans}]`)

    const allFiles = findAllFiles(allServers)
    const fileCount = Object.values(allFiles).map(s => s.length).reduce((a, b) => a + b)
    ns.tprint(`Files: ${fileCount}`)
    if (showFilesOption) {
        for (const hostname of Object.keys(allFiles)) {
            const fileList = allFiles[hostname]
            ns.tprint(`  ${hostname}: [${fileList}]`)
        }
    }

    if (showServersOption) {
        await lsMain(ns)
    }

}