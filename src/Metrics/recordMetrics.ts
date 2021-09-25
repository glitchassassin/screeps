import { BaseBudgetConstraints, Budget, Budgets, TotalBudgetConstraints } from "Budgets";
import { FranchiseObjective } from "Objectives/Franchise";
import { PrioritizedObjectives } from "Objectives/initializeObjectives";
import { Metrics } from "screeps-viz";
import { byId } from "Selectors/byId";
import { calculateLogisticsThroughput } from "Selectors/calculateLogisticsThroughput";
import { franchiseIncomePerTick } from "Selectors/franchiseStatsPerTick";
import { getActualEnergyAvailable } from "Selectors/getActualEnergyAvailable";
import { getSpawnCost } from "Selectors/getSpawnCost";
import { getStorageBudget } from "Selectors/getStorageBudget";
import { rcl } from "Selectors/rcl";
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
                    spawnCost: number,
                    franchiseIncome: number,
                    logisticsThroughput: number,
                    logisticsOutput: number,
                    storageLevel: number,
                    storageLevelTarget: number,
                    terminalLevel: number,
                    terminalLevelTarget: number,
                    facilitiesCosts: number,
                    objectives: {
                        [id: string]: {
                            priority: number,
                            energyBudget?: number,
                            spawnQuota?: number,
                            minions?: number
                        }
                    },
                    budgets: {
                        baseline?: Budget,
                        franchises?: Budget,
                        logistics?: Budget,
                        objectives: {
                            [id: string]: Budget
                        },
                        total?: Budget
                    }
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

        const objectives = PrioritizedObjectives
            .filter(o => !(o instanceof FranchiseObjective) || (!o.disabled && o.office === office))
            .reduce((sum, o) => {
                const metrics = o.metrics.get(office) ?? {};
                sum[o.id] = {
                    priority: o.priority,
                    ...metrics
                }
                return sum;
            }, {} as Record<string, {priority: number, energyBudget?: number, spawnQuota?: number, minions?: number}>);

        let facilitiesCosts = Memory.stats.offices[office]?.facilitiesCosts ?? 0;
        let buildEvents = 0;
        let logisticsOutput = 0;
        if (isNaN(facilitiesCosts)) facilitiesCosts = 0;
        for (let event of Game.rooms[office]?.getEventLog?.() ?? []) {
            if (
                (event.event === EVENT_BUILD || event.event === EVENT_REPAIR) &&
                !isNaN(event.data.amount)
            ) {
                facilitiesCosts += event.data.energySpent ?? event.data.amount;
                buildEvents += 1;
            } else if (event.event === EVENT_UPGRADE_CONTROLLER && rcl(office) < 3) {
                buildEvents += 1;
            } else if (event.event === EVENT_TRANSFER) {
                const target = byId(event.data.targetId as Id<Creep|AnyStoreStructure>);
                if (
                    (target instanceof StructureSpawn ||
                    target instanceof StructureStorage ||
                    target instanceof StructureContainer) &&
                    byId(event.objectId as Id<Creep>)?.memory?.objective === 'LogisticsObjective'
                ) {
                    logisticsOutput += event.data.amount;
                }
            }
        }
        // Metrics.update(heapMetrics[office].buildEfficiency, (buildEvents / Objectives['FacilitiesObjective'].assigned.length) ?? 0, 300);
        // console.log('efficiency', Metrics.avg(heapMetrics[office].buildEfficiency))

        const budgets = {
            baseline: BaseBudgetConstraints.get(office),
            objectives: {} as Record<string, Budget>,
            total: TotalBudgetConstraints.get(office)
        }
        for (let [id, budget] of Budgets.get(office) ?? []) {
            let label = id.replace('Objective', '').split('|')[0]
            budgets.objectives[label] = budget
        }

        Memory.stats.offices[office] = {
            ...Memory.stats.offices[office],
            controllerProgress: Game.rooms[office].controller?.progress ?? 0,
            controllerProgressTotal: Game.rooms[office].controller?.progressTotal ?? 0,
            controllerLevel: Game.rooms[office].controller?.level ?? 0,
            energyAvailable: Game.rooms[office].energyAvailable,
            energyCapacityAvailable: Game.rooms[office].energyCapacityAvailable,
            spawnUptime: getSpawns(office).filter(s => s.spawning).length,
            spawnCost: getSpawnCost(office),
            franchiseIncome: franchiseIncomePerTick(office),
            logisticsThroughput: calculateLogisticsThroughput(office),
            logisticsOutput,
            storageLevel: storageEnergyAvailable(office),
            storageLevelTarget: getStorageBudget(office),
            terminalLevel: Game.rooms[office].terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,
            terminalLevelTarget: Game.rooms[office].terminal ? (Memory.offices[office].resourceQuotas[RESOURCE_ENERGY] ?? 2000) : 0,
            facilitiesCosts,
            objectives,
            budgets
        }
    }
}, 'recordMetrics')
