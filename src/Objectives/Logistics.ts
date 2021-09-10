import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromFranchise } from "Behaviors/getEnergyFromFranchise";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { Budgets } from "Selectors/budgets";
import { byId } from "Selectors/byId";
import { facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";
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
import { Objective } from "./Objective";

declare global {
    interface CreepMemory {
        logisticsTarget?: Id<Tombstone|Source>
    }
}

const logisticsObjectives = new Map<string, Set<Id<Creep>>>();

export class LogisticsObjective extends Objective {
    budget(office: string, energy: number) {
        // If RCL > 3, and we have fewer than ten roads to construct, use beefier Accountants
        const roads = rcl(office) > 3 && facilitiesWorkToDo(office)
            .filter(s => !s.structure && s.structureType === STRUCTURE_ROAD).length < 10

        // Increase budget if Storage is low, decrease if there is a surplus
        let body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, roads);
        let surplus = Math.max(-2, Math.min(2, Math.floor((storageEnergyAvailable(office) - getStorageBudget(office)) / CONTAINER_CAPACITY))) // (body.filter(p => p === CARRY).length * CARRY_CAPACITY)
        let cost = minionCostPerTick(body);
        let distance = (franchiseDistances(office) / franchiseCount(office)) * 2;
        let targetCarry = (distance * energy) / CARRY_CAPACITY;
        let count = Math.ceil(targetCarry / body.filter(c => c === CARRY).length) - surplus;
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
            const budget = Budgets.get(office)?.get(this.id) ?? 0;

            // If RCL > 3, and we have fewer than ten roads to construct, use beefier Accountants
            const roads = rcl(office) > 3 && facilitiesWorkToDo(office)
                .filter(s => !s.structure && s.structureType === STRUCTURE_ROAD).length < 10

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
                        if (amount > bestAmount) {
                            bestTarget = id;
                            bestAmount = amount;
                        }
                        if (amount >= creep.store.getFreeCapacity(RESOURCE_ENERGY)) {
                            break;
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
                    if (opp.creep) {
                        if (
                            opp.creep.memory.objective === 'FacilitiesObjective' &&
                            opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                        ) {
                            creep.transfer(opp.creep, RESOURCE_ENERGY);
                            energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining)
                            if (opp.creep.memory.state === States.GET_ENERGY) {
                                setState(States.WORKING)(opp.creep)
                            }
                        } else if (
                            opp.creep.memory.objective === 'LogisticsObjective' &&
                            opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                            opp.creep.store.getFreeCapacity(RESOURCE_ENERGY) <= energyRemaining &&
                            target &&
                            opp.creep.pos.getRangeTo(target) < creep.pos.getRangeTo(target)
                        ) {
                            creep.transfer(opp.creep, RESOURCE_ENERGY);
                            energyRemaining -= Math.min(opp.creep.store.getFreeCapacity(), energyRemaining)
                            if (opp.creep.memory.state === States.WITHDRAW) {
                                moveTo(target.pos, 1)(opp.creep)
                                setState(States.DEPOSIT)(opp.creep)
                            }
                        }
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
