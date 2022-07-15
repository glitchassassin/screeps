import { MissionStatus, MissionType } from "Missions/Mission";
import { Metrics } from "screeps-viz";
import { franchiseIncome } from "Selectors/franchiseIncome";
import { getActualEnergyAvailable } from "Selectors/getActualEnergyAvailable";
import { getSpawns } from "Selectors/roomPlans";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import profiler from "utils/profiler";
import { heapMetrics } from "./heapMetrics";

type MissionStats = Partial<Record<MissionType, {
    count: number,
    // cpuAccuracy: number,
    // energyAccuracy: number,
    efficiency: number,
}>>

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
                    terminalLevel: number,
                    missions: MissionStats
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

        // Compute mission data
        const missions: MissionStats = {};
        for (const mission of Memory.offices[office].activeMissions.filter(m => m.status === MissionStatus.RUNNING)) {
            missions[mission.type] ??= {
                count: 0,
                // cpuAccuracy: 0,
                // energyAccuracy: 0,
                efficiency: 0,
            }
            missions[mission.type]!.count += 1;
            missions[mission.type]!.efficiency += (mission.efficiency.working / mission.efficiency.running) * 100;
        }
        for (const type in missions) {
            missions[type as MissionType]!.efficiency /= missions[type as MissionType]!.count;
        }
        // for (const type in Memory.offices[office].missionResults) {
        //     missions[type as MissionType] ??= {
        //         count: 0,
        //         // cpuAccuracy: 0,
        //         // energyAccuracy: 0,
        //         efficiency: 0
        //     }
        //     const mission = missions[type as MissionType]!;
        //     let cpu = 0;
        //     let energy = 0;
        //     let efficiency = 0;
        //     for (const result of Memory.offices[office].missionResults[type as MissionType]!) {
        //         cpu += ((result.estimate.cpu - result.actual.cpu) / result.estimate.cpu) * 100;
        //         energy += ((result.estimate.energy - result.actual.energy) / result.estimate.energy) * 100;
        //         efficiency += result.efficiency * 100;
        //     }
        //     // mission.cpuAccuracy = cpu / Memory.offices[office].missionResults[type as MissionType]!.length;
        //     // mission.energyAccuracy = energy / Memory.offices[office].missionResults[type as MissionType]!.length;
        //     mission.efficiency = efficiency / Memory.offices[office].missionResults[type as MissionType]!.length;
        // }

        Memory.stats.offices[office] = {
            ...Memory.stats.offices[office],
            controllerProgress: Game.rooms[office].controller?.progress ?? 0,
            controllerProgressTotal: Game.rooms[office].controller?.progressTotal ?? 0,
            controllerLevel: Game.rooms[office].controller?.level ?? 0,
            energyAvailable: Game.rooms[office].energyAvailable,
            energyCapacityAvailable: Game.rooms[office].energyCapacityAvailable,
            spawnUptime: getSpawns(office).filter(s => s.spawning).length,
            storageLevel: storageEnergyAvailable(office),
            franchiseIncome: franchiseIncome(office),
            terminalLevel: Game.rooms[office].terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,
            missions
        }
    }
}, 'recordMetrics')
