import { Metrics } from "screeps-viz";
import { getActualEnergyAvailable } from "Selectors/getActualEnergyAvailable";
import { getStorageBudget } from "Selectors/getStorageBudget";
import { getSpawns } from "Selectors/roomPlans";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import profiler from "utils/profiler";
import { heapMetrics } from "./heapMetrics";

declare global {
    interface Memory {
        stats: {
            gclMilestones?: Record<number, number>,
            gcl: {
                progress: number,
                progressTotal: number,
                level: number,
            },
            cpu: {
                bucket: number,
                limit: number,
                used: number,
            },
            offices: {
                [id: string]: {
                    controllerProgress: number,
                    controllerProgressTotal: number,
                    controllerLevel: number,
                    energyAvailable: number,
                    energyCapacityAvailable: number,
                    spawnUptime: number,
                    franchiseIncome: number,
                    storageLevel: number,
                    storageLevelTarget: number,
                    terminalLevel: number,
                    terminalLevelTarget: number,
                }
            },
            profiling: Record<string, number>,
            time: number,
            creepCount: number,
            officeCount: number,
        }
    }
}

export const recordMetrics = profiler.registerFN(() => {
    let stats = {
        time: Game.time,
        gcl: {
            progress: Game.gcl.progress,
            progressTotal: Game.gcl.progressTotal,
            level: Game.gcl.level,
        },
        cpu: {
            bucket: Game.cpu.bucket,
            limit: Game.cpu.limit,
            used: Game.cpu.getUsed(),
        },
        creepCount: Object.keys(Game.creeps).length,
        officeCount: Object.keys(Memory.offices).length
    }

    // Initialize, if necessary
    Memory.stats ??= {
        ...stats,
        profiling: {},
        gclMilestones: {},
        offices: {}
    }
    Memory.stats = {
        ...Memory.stats,
        ...stats
    }
    Memory.stats.gclMilestones ??= {};
    Memory.stats.gclMilestones[Game.gcl.level] ??= Game.time;

    for (let office in Memory.offices) {
        heapMetrics[office] ??= {
            roomEnergy: Metrics.newTimeseries(),
            buildEfficiency: Metrics.newTimeseries(),
            storageLevel: Metrics.newTimeseries(),
        }
        Metrics.update(heapMetrics[office].roomEnergy, getActualEnergyAvailable(office), 300);
        Metrics.update(heapMetrics[office].storageLevel, storageEnergyAvailable(office), 100);

        Memory.stats.offices[office] = {
            ...Memory.stats.offices[office],
            controllerProgress: Game.rooms[office].controller?.progress ?? 0,
            controllerProgressTotal: Game.rooms[office].controller?.progressTotal ?? 0,
            controllerLevel: Game.rooms[office].controller?.level ?? 0,
            energyAvailable: Game.rooms[office].energyAvailable,
            energyCapacityAvailable: Game.rooms[office].energyCapacityAvailable,
            spawnUptime: getSpawns(office).filter(s => s.spawning).length,
            storageLevel: storageEnergyAvailable(office),
            storageLevelTarget: getStorageBudget(office),
            terminalLevel: Game.rooms[office].terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,
            terminalLevelTarget: Game.rooms[office].terminal ? (Memory.offices[office].resourceQuotas[RESOURCE_ENERGY] ?? 2000) : 0,
        }
    }
}, 'recordMetrics')
