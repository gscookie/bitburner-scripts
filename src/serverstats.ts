import { NS, Server } from '@ns'

/** @param {Set<String>} seen 
	@param {Set<String>} searched **/
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
    async function findAllServers(ns: NS): Promise<string[]> {
        ns.disableLog("scan")
        if(ns.fileExists("serverList.json")) {
            return JSON.parse(await ns.read("serverList.json"))
        }
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
        const result = [...seen]
        await ns.write("serverList.json", JSON.stringify(result))
    
        return result
    }
    
    const SCRIPTS = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"]
    
    /** @param {NS} ns
     *  @return {String[]} list of all known port hacking scripts
     */
    function getKnownScripts(ns: NS): string[] {
        return SCRIPTS.filter(script => ns.fileExists(script, "home"))
    }
    
    function format_money(num: number): string {
        const mils = Math.round(num / 10000.0) / 100.0
        return `$${mils}m`
    }
    
    /** @param {NS} ns
     *  @param {Server[]} serverList
     *  **/
    function findAllFiles(ns: NS, serverList: Server[]): {[key: string]: string[]} {
        const files: {[key: string]: string[]} = {}
        for (const server of serverList) {
            files[server.hostname] = ns.ls(server.hostname)
        }
        return files
    }
    
    /** @param {NS} ns **/
    export async function main(ns: NS): Promise<void> {
        const serverNames = await findAllServers(ns)
    
        const showFilesOption = ns.args.includes('files')
    
    
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
        ns.tprint("")
    
        const ownedServerRam = ownedServers.map(s => s.maxRam).reduce((a, b) => a + b, 0)
        ns.tprint(`Owned Servers: ${ownedServers.length} [Total RAM: ${ownedServerRam}]`)
        const pwnedServerRam = pwnedServers.map(s => s.maxRam).reduce((a, b) => a + b, 0)
        ns.tprint(`Pwned Servers: ${pwnedServers.length} [Total RAM: ${pwnedServerRam}]`)
        const pwnedServerSec = pwnedServers.map(s => s.hackDifficulty).reduce((a, b) => a + b)
        const pwnedServerMinSec = pwnedServers.map(s => s.minDifficulty).reduce((a, b) => a + b)
        ns.tprint(`  Security [Raw]: ${pwnedServerSec}/${pwnedServerMinSec}`)
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
    
        const allFiles = findAllFiles(ns, allServers)
        const fileCount = Object.values(allFiles).map(s => s.length).reduce((a, b) => a + b)
        ns.tprint(`Files: ${fileCount}`)
        if (showFilesOption) {
            for (const hostname of Object.keys(allFiles)) {
                const fileList = allFiles[hostname]
                ns.tprint(`  ${hostname}: [${fileList}]`)
            }
        }
    
    }