import { FranchiseObjective } from "Objectives/Franchise";
import { Metrics } from "screeps-viz";
import { PrioritizedObjectives } from "Objectives/initializeObjectives";
import { byId } from "Selectors/byId";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { franchiseIncomePerTick } from "Selectors/franchiseIncomePerTick";
import { heapMetrics } from "./heapMetrics";
import { sourceIds } from "Selectors/roomCache";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";

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
                    franchiseEnergyAvailable: number,
                    franchiseSurplus: number,
                    franchiseIncome: number,
                    storageLevel: number,
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

export const recordMetrics = () => {
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
        Metrics.update(heapMetrics[office].roomEnergy, Game.rooms[office].energyAvailable ?? 0, 600);

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

        Memory.stats.offices[office] = {
            ...Memory.stats.offices[office],
            controllerProgress: Game.rooms[office].controller?.progress ?? 0,
            controllerProgressTotal: Game.rooms[office].controller?.progressTotal ?? 0,
            controllerLevel: Game.rooms[office].controller?.level ?? 0,
            energyAvailable: Game.rooms[office].energyAvailable,
            energyCapacityAvailable: Game.rooms[office].energyCapacityAvailable,
            franchiseEnergyAvailable: sourceIds(office).map(byId).reduce((sum, s) => sum + (s?.energy ?? 0), 0),
            franchiseSurplus: sourceIds(office).map(franchiseEnergyAvailable).reduce((sum, s) => sum + s, 0),
            franchiseIncome: franchiseIncomePerTick(office),
            storageLevel: storageEnergyAvailable(office),
            objectives
        }
    }

}
