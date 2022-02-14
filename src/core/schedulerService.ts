import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const db: {[k:string]: any} = {}
    const connections = undefined
    
    while(true) {
        await ns.sleep(10000)
    }
}