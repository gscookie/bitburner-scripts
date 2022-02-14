import { NS } from '@ns'
import { asStr } from '/lib/util'

export async function main(ns : NS) : Promise<void> {
    const target = asStr(ns.args[0])
    const result = await ns.hack(target)
    if(result > 0) {
        ns.tprint(`INFO -- Hacking ${target} succeeded for ${ns.nFormat(result, '$0.00a')}`)
    } else {
        ns.tprint(`WARN -- Hacking ${target} failed.`)
    }
}