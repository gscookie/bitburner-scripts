import { NS } from '@ns'
import { asStr } from '/lib/util'

export async function main(ns: NS): Promise<void> {
    await ns.grow(asStr(ns.args[0]))
}