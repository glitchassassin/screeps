import { FranchiseObjective } from "Objectives/Franchise";
import { PrioritizedObjectives } from "Objectives/initializeObjectives";
import { Metrics } from "screeps-viz";
import { byId } from "Selectors/byId";
import { franchiseIncomePerTick } from "Selectors/franchiseIncomePerTick";
import { getStorageBudget } from "Selectors/getStorageBudget";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import profiler from "utils/profiler";
import { heapMetrics } from "./heapMetrics";

declare global {
    interface Memory {
        stats: {
            gcl: {
                progress: number,
                progressTotal: number,
                level: number
            },
            cpu: {
                bucket: number,
                limit: number,
                used: number
            },
            offices: {
                [id: string]: {
                    controllerProgress: number,
                    controllerProgressTotal: number,
                    controllerLevel: number,
                    energyAvailable: number,
                    energyCapacityAvailable: number,
                    franchiseIncome: number,
                    storageLevel: number,
                    storageLevelTarget: number,
                    facilitiesCosts: number,
                    objectives: {
                        [id: string]: {
                            energy: number,
                            assigned: number,
                            priority: number,
                        }
                    }
                }
            },
            time: number,
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
    }

    // Initialize, if necessary
    Memory.stats ??= {
        ...stats,
        offices: {}
    }
    Memory.stats = {
        ...Memory.stats,
        ...stats
    }

    for (let office in Memory.offices) {
        heapMetrics[office] ??= {
            roomEnergy: Metrics.newTimeseries()
        }
        Metrics.update(heapMetrics[office].roomEnergy, Game.rooms[office].energyAvailable ?? 0, 300);

        const objectives = PrioritizedObjectives
            .filter(o => !(o instanceof FranchiseObjective) || (!o.disabled && o.office === office))
            .reduce((sum, o) => {
                sum[o.id] = {
                    energy: o.energyValue(office),
                    assigned: o.assigned.map(byId).filter(c => c?.memory.office === office).length,
                    priority: o.priority
                }
                return sum;
            }, {} as Record<string, {energy: number, assigned: number, priority: number}>);

        let facilitiesCosts = Memory.stats.offices[office]?.facilitiesCosts ?? 0;
        if (isNaN(facilitiesCosts)) facilitiesCosts = 0;
        for (let event of Game.rooms[office]?.getEventLog() ?? []) {
            if (
                (event.event === EVENT_BUILD || event.event === EVENT_REPAIR) &&
                !isNaN(event.data.energySpent)
            ) {
                facilitiesCosts += event.data.energySpent;
            }
        }


        Memory.stats.offices[office] = {
            ...Memory.stats.offices[office],
            controllerProgress: Game.rooms[office].controller?.progress ?? 0,
            controllerProgressTotal: Game.rooms[office].controller?.progressTotal ?? 0,
            controllerLevel: Game.rooms[office].controller?.level ?? 0,
            energyAvailable: Game.rooms[office].energyAvailable,
            energyCapacityAvailable: Game.rooms[office].energyCapacityAvailable,
            franchiseIncome: franchiseIncomePerTick(office),
            storageLevel: storageEnergyAvailable(office),
            storageLevelTarget: getStorageBudget(Game.rooms[office].controller?.level ?? 0),
            facilitiesCosts,
            objectives
        }
    }
}, 'recordMetrics')
