import { NodeStats, NS } from '@ns'

class NodeStatsEx {
    idx: number;
    ns: NS;
    level: number;
    raw: NodeStats;
    upgradeLevelCost: number;
    upgradeRamCost: number;
    upgradeCoreCost: number;
    minLevelUpgradeCost: number;
    minUpgradeCost: number;

    constructor(ns: NS, idx: number) {
        this.ns = ns
        this.idx = idx
        this.raw = ns.hacknet.getNodeStats(idx)
        this.level = this.raw.level

        const l = 10 - (this.level % 10)
        this.upgradeLevelCost = this.ns.hacknet.getLevelUpgradeCost(idx, l)
        this.minLevelUpgradeCost = this.ns.hacknet.getLevelUpgradeCost(idx, 1)
        this.upgradeRamCost = this.ns.hacknet.getRamUpgradeCost(idx, 1)
        this.upgradeCoreCost = this.ns.hacknet.getCoreUpgradeCost(idx, 1)
        
        this.minUpgradeCost = this.upgradeLevelCost
        if (this.upgradeCoreCost < this.minLevelUpgradeCost) {
            this.minUpgradeCost = this.upgradeCoreCost
        }
        if (this.upgradeRamCost < this.minLevelUpgradeCost) {
            this.minUpgradeCost = this.upgradeRamCost
        }
    }

}

class HackNetDao {
    ns: NS;
    currentMoney: number;
    nodeCost: number;
    nodeCount: number;
    nodeStats: NodeStatsEx[];

    /** @param {NS} ns **/
    constructor(ns: NS) {
        this.ns = ns
        this.currentMoney = 0
        this.nodeCost = 0
        this.nodeCount = 0
        this.nodeStats = []
        this.update()
    }

    update() {
        this.currentMoney = this.ns.getServerMoneyAvailable("home")
        this.nodeCost = this.ns.hacknet.getPurchaseNodeCost()
        this.nodeCount = this.ns.hacknet.numNodes()
        this.nodeStats = [...Array(this.nodeCount)].map((_, i) => new NodeStatsEx(this.ns, i))
    }

    buyNode() {
        const newNode = this.ns.hacknet.purchaseNode()
        this.update()
        return newNode
    }

    getCheapestUpgrade() {
        return this.nodeStats.map((e: any, i) => [i, e.minUpgradeCost]).sort((a, b) => a[1] - b[1])[0]
    }

    cheapestUpgradeCost() {
        const minNode = this.getCheapestUpgrade()
        if (!minNode) {
            return Number.POSITIVE_INFINITY
        }
        return minNode[1]
    }

    buyCheapestUpgrade() {
        let success = true
        const minNodeId = this.getCheapestUpgrade()[0]
        const nodestats = this.nodeStats[minNodeId]
        if (nodestats.upgradeCoreCost < nodestats.minLevelUpgradeCost) {
            success = this.ns.hacknet.upgradeCore(minNodeId, 1)
        } else if (nodestats.upgradeRamCost < nodestats.minLevelUpgradeCost) {
            success = this.ns.hacknet.upgradeRam(minNodeId, 1)
        } else {
            const l = 10 - (nodestats.raw.level % 10)
            success = this.ns.hacknet.upgradeLevel(minNodeId, l)
        }
        this.update()
        return success
    }
}

function sort_asc(a: number, b: number): number {
    return a - b
}

/** @param {HackNetDao} hn **/
function optimize(hn: HackNetDao) {
    const ns = hn.ns
    const MAX_NODE_COST = 0.50
    const MAX_UPGRADE_COST = 0.50
    const MAX_NODE_COST_RAW = 1000000000

    ns.print(`\n>> OPTIMIZE <<\n>> ${(new Date()).toLocaleDateString()} <<\n>> ${(new Date()).toLocaleTimeString()} <<`)

    ns.print(`   Current Money: ${format_money(hn.currentMoney)}`)
    ns.print(`Levels: ${hn.nodeStats.map((e: any) => e.level).sort(sort_asc)}`)

    let success = true
    ns.print(`   MAX_NODE_COST: ${format_money(hn.currentMoney * MAX_NODE_COST)}`)
    ns.print(`   NEW_NODE_COST: ${format_money(hn.nodeCost)}`)

    while (((hn.nodeCost / hn.currentMoney) < MAX_NODE_COST) && hn.nodeCost <= MAX_NODE_COST_RAW && success) {
        success = (hn.buyNode() >= 0)
        ns.print("Purchased node!")
        ns.print(`   NEW_NODE_COST: ${format_money(hn.nodeCost)}`)
    }

    success = true
    ns.print(`MAX_UPGRADE_COST: ${format_money(hn.currentMoney * MAX_UPGRADE_COST)}`)
    ns.print(`NEW_UPGRADE_COST: ${format_money(hn.cheapestUpgradeCost())}`)

    while (((hn.cheapestUpgradeCost() / hn.currentMoney) < MAX_UPGRADE_COST) && success) {
        success = hn.buyCheapestUpgrade()
        ns.print("Purchased upgrade!")
        ns.print(`NEW_UPGRADE_COST: ${format_money(hn.cheapestUpgradeCost())}`)
    }
    ns.print(`   Current Money: ${format_money(hn.currentMoney)}`)
    ns.print(`Levels: ${hn.nodeStats.map((e: any) => e.level).sort(sort_asc)}`)

}

function format_money(num: number): string {
    const mils = Math.round(num / 10000.0) / 100.0
    return `$${mils}m`

}


/** @param {NS} ns **/
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL")
    const hn = new HackNetDao(ns)
    while (true) {
        optimize(hn)
        await ns.sleep(60000)
        hn.update()
    }

}