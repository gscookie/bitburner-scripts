import { NS, Player, Server } from '@ns'

export const CACHE_FILENAME = "/cache/globalCache.txt"

interface GlobalCacheSerialized {
    serverList: Server[];
    player: Player;
    lastUpdate: number;
    analyzeStats: AnalyzeStats[];
}

export interface AnalyzeStats {
    hostname: string,
    exact: boolean,
    hackAnalyze: number,
    hackAnalyzeChance: number,
    hackAnalyzeThreads: number,
    hackAnalyzeSecurity: number,
    growthAnalyzeThreads: number,
    growthAnalyzeSecurity: number,
    weakenHackThreads: number,
    weakenGrowthThreads: number,
    hackTime: number,
    growTime: number,
    weakenGrowTime: number,
    weakenHackTime: number,
    totalTime: number,
    maxStepTime: number,
    totalThreads: number,
    maxStepThreads: number,
    totalMoney: number,
    cashPerThread: number,
    cashPerSec: number,
    cashPerThreadSec: number,
    cashPerBatchSec: number
}

export class GlobalCache {
    servers: { [k: string]: Server };
    serverList: Server[];
    player: Player;
    lastUpdate: number;
    analyzeStats: AnalyzeStats[];
    stats: { [k: string]: AnalyzeStats };

    constructor(serverList: Server[], player: Player, lastUpdate: number, analyzeStats: AnalyzeStats[]) {
        this.serverList = serverList
        this.player = player
        this.lastUpdate = lastUpdate
        this.analyzeStats = analyzeStats

        this.servers = Object.fromEntries(serverList.map(s => [s.hostname, s]))
        this.stats = Object.fromEntries(analyzeStats.map(s => [s.hostname, s]))
    }

    toJSON(): GlobalCacheSerialized {
        return {
            serverList: this.serverList,
            player: this.player,
            lastUpdate: this.lastUpdate,
            analyzeStats: this.analyzeStats
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    static fromJSON(val: any): GlobalCache {
        const cache = val as GlobalCacheSerialized
        return new GlobalCache(cache.serverList, cache.player, cache.lastUpdate, cache.analyzeStats)
    }

    static load(ns: NS): GlobalCache {
        return this.fromJSON(JSON.parse(ns.read(CACHE_FILENAME)))
    }
}