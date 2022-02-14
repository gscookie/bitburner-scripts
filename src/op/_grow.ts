import { NS } from '@ns'
import { asStr } from '/lib/util';

export async function main(ns: NS): Promise<void> {
    const target = asStr(ns.args[0])
    while (ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)) {
        await ns.grow(target);
    }
    ns.tprint(`[${(new Date()).toLocaleDateString()} ${(new Date()).toLocaleTimeString()}] ! GROW COMPLETE FOR "${target}" !`)
}