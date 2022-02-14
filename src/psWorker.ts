import { NS } from '@ns'

export async function main(ns: NS): Promise<void> {
    const pServers = ns.getPurchasedServers().concat(["home"]).map(s => ns.getServer(s))
    for (const ps of pServers) {
        ns.tprint(`${ps.hostname} [${ns.nFormat((ps.maxRam - ps.ramUsed) * Math.pow(2, 30), '0.00b')}/${ns.nFormat(ps.maxRam * Math.pow(2, 30), '0.00b')}]`)
        const processes = ns.ps(ps.ip)
        for (const proc of processes) {
            ns.tprint(`  ${proc.threads}x ${proc.filename} ${proc.args.join(" ")}`)
        }
    }
}