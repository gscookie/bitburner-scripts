import { NS } from '@ns'
import { asStr } from '/lib/util';

export async function main(ns: NS): Promise<void> {
    const target = asStr(ns.args[0])
    while (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)) {
        await ns.weaken(asStr(target));
    }
    ns.tprint(`[${(new Date()).toLocaleDateString()} ${(new Date()).toLocaleTimeString()}] ! WEAKEN COMPLETE FOR "${target}" !`)
}