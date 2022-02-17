import { NS } from '@ns'
import { findAllServers } from '/lib/servers'
import { msToTime } from '/lib/util'
import { ANALYZE_CACHE_FILENAME } from '/core/globalCacheDaemon'

const SCRIPT = '_hackonce.js'

export async function main(ns : NS) : Promise<void> {
    ns.ps("home").filter(ps => ps.filename != ns.getScriptName()).forEach(ps => ns.kill(ps.pid))
    ns.rm(ANALYZE_CACHE_FILENAME, "home")

    ns.run('/core/fileWatchDaemon.js')
    ns.run('/core/globalMetricsDaemon.js')
    ns.run('/core/globalCacheDaemon.js')
    ns.run('/core/autoHackDaemon.js')
    ns.run('/core/hacknetDaemon.js')
    ns.run('/core/fileSyncDaemon.js')
    
    // ns.run('/core/schedulerService.js')
    
    // Just chill for a minute or so
    await ns.sleep(60*1000)

    const allServers = await findAllServers(ns)

    const availableRam = ns.getServerMaxRam("home") - ns.getServerUsedRam("home") - (ns.getScriptRam('_setup.js') * 9)
    const scriptSize = ns.getScriptRam(SCRIPT)
    const threads = Math.floor(availableRam / scriptSize)
    
    for(let i = 0; i < 10; i++) {
        const target = allServers.map(s => ns.getServer(s)).filter(s => s.hasAdminRights && s.moneyAvailable > 100).sort((a,b) => b.moneyAvailable - a.moneyAvailable)[0]?.hostname
        if(!target) {
            break;
        }
        const pid = ns.run(SCRIPT, threads, target)
        const hackTime = msToTime(ns.getHackTime(target))
        ns.tprint(`INFO -- Hacking ${target} (${ns.nFormat(ns.getServer(target).moneyAvailable, '$0.00a')}) with ${threads} threads (pid:${pid}). Completing in ${hackTime}`)
        await ns.sleep(ns.getHackTime(target) * 1.05)
        while(ns.scriptRunning(SCRIPT, "home")) {
            ns.print('WARN -- Script still running? Sleeping some more.')
            await ns.sleep(30*1000)
        }
    }

    const target = allServers.map(s => ns.getServer(s)).filter(s => s.hasAdminRights && s.moneyMax > 100).sort((a,b) => b.moneyMax - a.moneyMax)[0].hostname
    ns.tprint(`INFO -- Init Complete.`)
    ns.run('_setup.js', 10, "home", target)
}