import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const p = ns.getPlayer()
    const s = ns.getServer('rho-construction')
    const hackPct = ns.formulas.hacking.hackPercent(s, p)
    
    ns.print(hackPct)
}