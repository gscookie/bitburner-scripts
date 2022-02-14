import { NS } from '@ns'
import { asStr } from '/lib/util';

export async function main(ns: NS): Promise<void> {
    const target = asStr(ns.args[0])
    while (ns.getServerMoneyAvailable(target) > 0) {
        await ns.hack(target);
    }
    ns.tprint(`[${(new Date()).toLocaleDateString()} ${(new Date()).toLocaleTimeString()}] ! HACK COMPLETE FOR "${target}" !`)
}