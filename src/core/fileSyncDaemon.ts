import { NS } from '@ns'
import { LOGGER } from '/lib/logging'
import { findAllServers } from '/lib/servers'
import { msToTime } from '/lib/util'

const EXCLUDE_PATHS = ["/home/", "/tmp/", "/core/"]
const ALLOWED_EXTS = [".js", ".txt"]

export async function main(ns : NS) : Promise<void> {
    LOGGER.init(ns)
    ns.disableLog('scp')
    ns.disableLog('sleep')
    while(true) {
        const startTime = Date.now()
        const files = ns.ls("home").filter(fn => ALLOWED_EXTS.some(ext => fn.endsWith(ext) && !EXCLUDE_PATHS.some(p => fn.startsWith(p))))
        const allServers = (await findAllServers(ns)).filter(s => s != 'home')

        for(const server of allServers) {
            await ns.scp(files, server)
            await ns.sleep(100)
        }

        LOGGER.info(`Synchronized ${files.length} files across ${allServers.length} server(s) in ${msToTime(Date.now() - startTime)}`)
        await ns.sleep(1000)
    }
}