import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { heapMetrics } from "Metrics/heapMetrics";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { Metrics } from "screeps-viz";
import { Budgets } from "Selectors/budgets";
import { facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";
import { getStorageBudget } from "Selectors/getStorageBudget";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        facilitiesTarget?: string;
    }
}

const UPGRADE_CONTROLLER_COST = 1

export class UpgradeObjective extends Objective {
    shouldSpawn(office: string, budget: number) {
        // Spawn based on maximizing use of available energy
        let target = Math.floor(budget / this.cost(office));
        let storageSurplus = heapMetrics[office]?.storageLevel ? (Metrics.avg(heapMetrics[office].storageLevel) > getStorageBudget(office)) : false
        const minions = this.minions(office);
        target += ((Game.rooms[office]?.controller?.ticksToDowngrade ?? Infinity) < 10000) ? 1 : 0

        // Spawn a new upgrader if the 100-tick average storage level is higher than the budget
        if (storageSurplus && !minions.some(creep => creep.ticksToLive && creep.ticksToLive > (CREEP_LIFE_TIME - 100))) {
            target += 1;
        }

        this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: minions.length})

        return minions.length < target; // Upgrading is capped at RCL8, spawn only one
    }
    cost(office: string) {
        let body = MinionBuilders[MinionTypes.PARALEGAL](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body) + body.filter(p => p === WORK).length;
        return cost;
    }
    budget(office: string, energy: number) {
        let body = MinionBuilders[MinionTypes.PARALEGAL](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body) + body.filter(p => p === WORK).length;
        let constructionToDo = facilitiesWorkToDo(office).filter(s => !s.structure).length > 0;
        let downgradeImminent = (Game.rooms[office].controller?.ticksToDowngrade ?? 0) < 10000
        let count = constructionToDo ? (downgradeImminent ? 1 : 0) : Math.min(energy / cost);
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }
    spawn() {
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id) ?? 0;
            if (this.shouldSpawn(office, budget)) {
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.PARALEGAL,
                    MinionBuilders[MinionTypes.PARALEGAL](spawnEnergyAvailable(office))
                )({
                    preferredSpawn: roomPlans(office)?.headquarters?.spawn.structure as StructureSpawn
                })
            }
        }
    }

    action(creep: Creep) {
        // Do work
        if (!creep.memory.state || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.GET_ENERGY)(creep);
        }
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.WORKING)(creep);
        }
        if (creep.memory.state === States.GET_ENERGY) {
            if (getEnergyFromStorage(creep) === BehaviorResult.SUCCESS) {
                setState(States.WORKING)(creep);
            }
        }
        if (creep.memory.state === States.WORKING) {
            const controller = Game.rooms[creep.memory.office]?.controller
            if (!controller) return;
            moveTo(controller.pos, 3)(creep);
            if (creep.upgradeController(controller) == ERR_NOT_ENOUGH_ENERGY) {
                setState(States.GET_ENERGY)(creep);
            }
        }
    }
}

profiler.registerClass(UpgradeObjective, 'UpgradeObjective')
