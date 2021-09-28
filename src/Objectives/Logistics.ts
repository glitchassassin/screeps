import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromFranchise } from "Behaviors/getEnergyFromFranchise";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { Budgets } from "Budgets";
import { heapMetrics } from "Metrics/heapMetrics";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { Metrics } from "screeps-viz";
import { byId } from "Selectors/byId";
import { roadConstructionToDo } from "Selectors/facilitiesWorkToDo";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { franchisesByOffice } from "Selectors/franchisesByOffice";
import { franchiseCount, franchiseDistances } from "Selectors/franchiseStatsPerTick";
import { getStorageBudget } from "Selectors/getStorageBudget";
import { lookNear } from "Selectors/MapCoordinates";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { rcl } from "Selectors/rcl";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import { storageStructureThatNeedsEnergy } from "Selectors/storageStructureThatNeedsEnergy";
import profiler from "utils/profiler";
import { FranchiseObjectives } from "./Franchise";
import { Objective } from "./Objective";

declare global {
    interface CreepMemory {
        logisticsTarget?: Id<Tombstone|Source>
    }
}

const logisticsObjectives = new Map<string, Set<Id<Creep>>>();

export class LogisticsObjective extends Objective {
    budgetThroughput(office: string, energy: number) {
        // If RCL > 3, and we have fewer than ten roads to construct, use beefier Accountants
        const roads = rcl(office) > 3 && roadConstructionToDo(office).length < 10

        let body = MinionBuilders[MinionTypes.ACCOUNTANT](Game.rooms[office].energyCapacityAvailable, 50, roads);
        let cost = minionCostPerTick(body);
        let distance = (franchiseDistances(office) / franchiseCount(office)) * 2;

        // Adjust for storage surplus
        const storageBudget = getStorageBudget(office);

        // 2 = 0% of budget
        // 1 = 100% of budget
        // 0.25 = 200% of budget
        // 0.25 = 300% of budget
        // Etc.
        let storageLevel = heapMetrics[office]?.storageLevel ? Metrics.avg(heapMetrics[office].storageLevel) : storageEnergyAvailable(office)
        let storageAdjustment = Math.max(0, (-1 * ((
            1.5 * (storageLevel / storageBudget)
        ) - 1) + 1))

        // console.log(office, storageAdjustment);

        let targetCarry = (distance * energy * storageAdjustment) / CARRY_CAPACITY;

        let count = Math.ceil(targetCarry / body.filter(c => c === CARRY).length);
        count = isNaN(count) ? 0 : count;

        const budget = {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }

        // console.log(storageLevel, storageBudget, storageAdjustment, distance, energy, targetCarry, cost, count, JSON.stringify(budget))
        return budget
    }
    budget(office: string, energy: number) {
        // If RCL > 3, and we have fewer than ten roads to construct, use beefier Accountants
        const roads = rcl(office) > 3 && roadConstructionToDo(office).length < 10

        let body = MinionBuilders[MinionTypes.ACCOUNTANT](Game.rooms[office].energyCapacityAvailable, 50, roads);
        let cost = minionCostPerTick(body);
        let count = Math.floor(energy / cost);
        count = isNaN(count) || !isFinite(count) ? 0 : count;
        // console.log(energy, cost, count)
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }

    private _actualCarry = new Map<string, number>();
    public actualCarry(office: string) {
        if (Game.time % 5 === 0) {
            let carry = 0;
            for (let a of this.minions(office)) {
                if (!a.ticksToLive || a.ticksToLive > 100) {
                    carry += a.getActiveBodyparts(CARRY);
                }
            }
            this._actualCarry.set(office, carry);
        }
        return this._actualCarry.get(office) ?? 0;
    }

    spawn() {
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;

            // If RCL > 3, and we have fewer than ten roads to construct, use beefier Accountants
            const roads = rcl(office) > 3 && roadConstructionToDo(office).length < 10

            let body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, roads);
            let cost = minionCostPerTick(body);
            let target = Math.floor(budget / cost);

            // Maintain one appropriately-sized Accountant
            // Pre-spawn accountants

            this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: this.minions(office).length})

            let result: ScreepsReturnCode = OK;
            if (this.minions(office).length < target) {
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, roads)
                )()
            }
        }
    }

    action(creep: Creep) {
        // logCpuStart()
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.WITHDRAW)(creep);
        } else if (!creep.memory.state) {
            setState(States.DEPOSIT)(creep);
        }
        // logCpu('initialize state')
        if (creep.memory.state === States.WITHDRAW) {
            // Select target
            const pos = posById(creep.memory.logisticsTarget) ?? byId(creep.memory.logisticsTarget)?.pos
            if (!creep.memory.logisticsTarget || !pos) {
                const tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 5, {filter: t => t.store.getUsedCapacity(RESOURCE_ENERGY) > 0}).shift()
                // logCpu('check tombstones')
                if (tombstone) {
                    // Get energy from nearby tombstone
                    creep.memory.logisticsTarget = tombstone.id;
                } else {
                    // Get energy from a franchise
                    let bestTarget = undefined;
                    let bestAmount = 0;
                    let bestDistance = Infinity;
                    for (let id of franchisesByOffice(creep.memory.office)) {
                        let capacity = 0;
                        let assigned = logisticsObjectives.get(id) ?? new Set();
                        logisticsObjectives.set(id, assigned);
                        for (let creepId of assigned) {
                            const creep = byId(creepId)
                            if (!creep || creep.memory.logisticsTarget !== id) assigned.delete(creepId)
                            capacity += byId(creepId)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0
                        }
                        const amount = franchiseEnergyAvailable(id) - capacity;
                        const distance = FranchiseObjectives[`FranchiseObjective|${id}`].distance;
                        if ((distance < bestDistance && bestAmount >= creep.store.getFreeCapacity(RESOURCE_ENERGY)) || (amount > bestAmount && bestAmount < creep.store.getFreeCapacity(RESOURCE_ENERGY))) {
                            bestTarget = id;
                            bestAmount = amount;
                            bestDistance = distance;
                        }
                    }
                    if (bestTarget) {
                        let assigned = logisticsObjectives.get(bestTarget) ?? new Set();
                        logisticsObjectives.set(bestTarget, assigned);
                        assigned.add(creep.id);
                        creep.memory.logisticsTarget = bestTarget;
                    }
                    // logCpu('check franchises')
                }
            }

            // Withdraw from target
            if (creep.memory.logisticsTarget) {
                const target = byId(creep.memory.logisticsTarget);
                if (target instanceof Tombstone && moveTo(target.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.withdraw(target, RESOURCE_ENERGY);
                    delete creep.memory.logisticsTarget;
                    setState(States.DEPOSIT)(creep);
                } else if (posById(creep.memory.logisticsTarget)) {
                    const result = getEnergyFromFranchise(creep, creep.memory.logisticsTarget as Id<Source>);
                    if (result === BehaviorResult.SUCCESS) {
                        delete creep.memory.logisticsTarget;
                        setState(States.DEPOSIT)(creep);
                    }
                }
                // logCpu('withdraw')
            } else {
                creep.say('Idle');
            }
        }
        if (creep.memory.state === States.DEPOSIT) {
            const target = storageStructureThatNeedsEnergy(creep.memory.office);

            if (!target || creep.pos.getRangeTo(target) > 1) {
                // Check for nearby targets of opportunity
                const opportunityTargets = lookNear(creep.pos);
                let energyRemaining = creep.store.getUsedCapacity(RESOURCE_ENERGY);
                for (const opp of opportunityTargets) {
                    if (opp.creep?.my) {
                        if (
                            opp.creep.memory.objective === 'FacilitiesObjective' &&
                            opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                            storageEnergyAvailable(creep.memory.office) >= Game.rooms[creep.memory.office].energyCapacityAvailable
                        ) {
                            creep.transfer(opp.creep, RESOURCE_ENERGY);
                            energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining)
                            if (opp.creep.memory.state === States.GET_ENERGY) {
                                setState(States.WORKING)(opp.creep)
                            }
                        } //else if (
                        //     opp.creep.memory.objective === 'LogisticsObjective' &&
                        //     opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                        //     opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) <= energyRemaining &&
                        //     target &&
                        //     opp.creep.pos.getRangeTo(target) < creep.pos.getRangeTo(target)
                        // ) {
                        //     creep.transfer(opp.creep, RESOURCE_ENERGY);
                        //     energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining)
                        //     if (opp.creep.memory.state === States.WITHDRAW) {
                        //         moveTo(target.pos, 1)(opp.creep)
                        //         setState(States.DEPOSIT)(opp.creep)
                        //     }
                        // }
                    }
                }
                if (energyRemaining === 0) {
                    setState(States.WITHDRAW)(creep);
                    return;
                }
            }
            if (!target) return;
            if (moveTo(target.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                creep.transfer(target, RESOURCE_ENERGY);
                // Back away
                creep.move(target.pos.getDirectionTo(creep.pos.x, creep.pos.y))
            }
            // logCpu('deposit')
        }
    }
}

profiler.registerClass(LogisticsObjective, 'LogisticsObjective')
