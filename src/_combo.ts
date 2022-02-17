import { NS } from '@ns'
import { LOGGER } from '/lib/logging'
import { asStr, moneyStr, timeStr } from '/lib/util'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data : AutocompleteData, args : string[]) : string[] {
    return [...data.servers]
}

function formatIncome(ns:NS, income: number, ms: number): string {
    const cashPerSec = income / (ms / 1000)
    return `[last.cycle.stats: ${moneyStr(ns, income)}/${timeStr(ns, ms)} (${moneyStr(ns, cashPerSec)})]`
}

/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    LOGGER.init(ns)
    ns.disableLog('getServerSecurityLevel')
    ns.disableLog('getServerMoneyAvailable')
    ns.disableLog('getServerMaxMoney')
    ns.disableLog('getServerMinSecurityLevel')

    const target = asStr(ns.args[0])
    const threads = typeof ns.args[1] === 'number' ? ns.args[1] as number : 1
    const moneyThresh = ns.getServerMaxMoney(target)
    const minDifficulty = ns.getServerMinSecurityLevel(target)
    const securityThresh = Math.min(100,minDifficulty + (0.05*threads))
    const initTime = Date.now()
    let lastCycleIncome = 0
    let lastCycleTime = 1

    let weakenCount = 0
    let growCount = 0
    let hackCount = 0
    let hackSuccessCount = 0

    let cycleStartTime = initTime
    const stats = () => [
        formatIncome(ns, lastCycleIncome, lastCycleTime),
        `[hack.cycle.stats Security: ${ns.nFormat(ns.getServerSecurityLevel(target), '0.00')}/${ns.nFormat(minDifficulty, '0.00')} Cash:${moneyStr(ns, ns.getServerMoneyAvailable(target))}/${moneyStr(ns, moneyThresh)}]`,
        `[h:g:w.stats: Hacks(successful):Grows:Weakens - ${hackCount}(${hackSuccessCount}):${growCount}:${weakenCount} ]`
    ].join(" ")
    while(true) {
        if (ns.getServerSecurityLevel(target) >= securityThresh) {
            weakenCount++
            LOGGER.info(`Running weaken on ${target}. ${stats()}`)
            await ns.weaken(target);
        } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
            growCount++
            LOGGER.info(`Running grow on ${target}. ${stats()}`)
            await ns.grow(target);
        } else {
            hackCount++
            LOGGER.info(`Running hack on ${target}. ${stats()}`)
            const amount = await ns.hack(target);
            if(amount > 0) {
                hackSuccessCount++
                const now = Date.now()
                lastCycleIncome = amount
                lastCycleTime = now - cycleStartTime
                cycleStartTime = now
                LOGGER.success(`Hack success! ${stats()}`)
            } else {
                LOGGER.warn(`Hack failed! ${stats()}`)
            }
        }
    }
}