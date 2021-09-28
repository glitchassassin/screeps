import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { Budgets } from "Budgets";
import { heapMetrics } from "Metrics/heapMetrics";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { Metrics } from "screeps-viz";
import { constructionToDo } from "Selectors/facilitiesWorkToDo";
import { getStorageBudget } from "Selectors/getStorageBudget";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { rcl } from "Selectors/rcl";
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
        const minions = this.minions(office);

        this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: minions.length})

        return minions.length < target; // Upgrading is capped at RCL8, spawn only one
    }
    cost(office: string) {
        let body = MinionBuilders[MinionTypes.PARALEGAL](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body) + body.filter(p => p === WORK).length;
        return cost;
    }
    budget(office: string, energy: number) {
        if (rcl(office) < 2) {
            return {
                cpu: 0,
                spawn: 0,
                energy: 0,
            }
        }
        let body = MinionBuilders[MinionTypes.PARALEGAL](Game.rooms[office].energyCapacityAvailable);
        let cost = minionCostPerTick(body) + body.filter(p => p === WORK).length;
        let construction = constructionToDo(office).length > 0;
        let downgradeImminent = (Game.rooms[office].controller?.ticksToDowngrade ?? 0) < 10000
        let storageSurplus = heapMetrics[office]?.storageLevel ? (Metrics.avg(heapMetrics[office].storageLevel) > getStorageBudget(office)) : false
        let count = construction ? ((downgradeImminent || storageSurplus) ? 1 : 0) : Math.min(energy / cost);
        count = isNaN(count) ? 0 : count;
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }
    spawn() {
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;
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
