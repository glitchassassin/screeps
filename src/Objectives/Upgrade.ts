import { BehaviorResult } from "Behaviors/Behavior";
import { getBoosted } from "Behaviors/getBoosted";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { Budgets } from "Budgets";
import { heapMetrics } from "Metrics/heapMetrics";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { Metrics } from "screeps-viz";
import { costToBoostMinion } from "Selectors/costToBoostMinion";
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
    public boostQuotas(office: string): { boost: MineralBoostConstant; amount: number; }[] {
        return [{ // Store at least enough to boost one creep
            boost: RESOURCE_GHODIUM_ACID,
            amount: 30 * 50
        }]
    }
    shouldSpawn(office: string, budget: number) {
        // Spawn based on maximizing use of available energy
        let target = Math.round(budget / this.cost(office));
        target = isNaN(target) ? 0 : target;
        if (rcl(office) === 8) target = Math.min(1, target); // Cap at one minion at RCL8
        const minions = this.minions(office);

        this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: minions.length})

        return minions.length < target; // Upgrading is capped at RCL8, spawn only one
    }
    cost(office: string) {
        let body = MinionBuilders[MinionTypes.PARALEGAL](Game.rooms[office].energyCapacityAvailable / 2);
        let workParts = body.filter(p => p === WORK).length;
        // Calculate boost costs
        const boostCost = costToBoostMinion(office, workParts, RESOURCE_GHODIUM_ACID);
        let cost = minionCostPerTick(body) + workParts + boostCost;
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
        let body = MinionBuilders[MinionTypes.PARALEGAL](Game.rooms[office].energyCapacityAvailable / 2);
        let workParts = body.filter(p => p === WORK).length;
        // Calculate boost costs
        const boostCost = costToBoostMinion(office, workParts, RESOURCE_GHODIUM_ACID);
        let cost = minionCostPerTick(body) + workParts + boostCost;

        let construction = constructionToDo(office).length > 0;
        let downgradeImminent = (Game.rooms[office].controller?.ticksToDowngrade ?? 0) < 10000
        let storageSurplus = heapMetrics[office]?.storageLevel ? (Metrics.avg(heapMetrics[office].storageLevel) > getStorageBudget(office)) : false
        let count = construction ? ((downgradeImminent || storageSurplus) ? 1 : 0) : Math.floor(energy / cost);
        if (rcl(office) === 8) count = Math.min(1, count); // Cap at one minion at RCL8
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
                this.recordEnergyUsed(office, spawnMinion(
                    office,
                    this.id,
                    MinionTypes.PARALEGAL,
                    MinionBuilders[MinionTypes.PARALEGAL](spawnEnergyAvailable(office) / 2),
                    [RESOURCE_GHODIUM_ACID]
                )({
                    preferredSpawn: roomPlans(office)?.headquarters?.spawn.structure as StructureSpawn
                }))
            }
        }
    }

    action(creep: Creep) {
        if (
            creep.memory.state === States.GET_BOOSTED
        ) {
            if (getBoosted(creep) === BehaviorResult.INPROGRESS) {
                return;
            }
            setState(States.GET_ENERGY)(creep);
        }
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
            const result = creep.upgradeController(controller)
            if (result === ERR_NOT_ENOUGH_ENERGY) {
                setState(States.GET_ENERGY)(creep);
            } else if (result === OK) {
                this.recordEnergyUsed(creep.memory.office, (UPGRADE_CONTROLLER_COST * UPGRADE_CONTROLLER_POWER) * creep.body.filter(p => p.type === WORK).length);
            }
        }
    }
}

profiler.registerClass(UpgradeObjective, 'UpgradeObjective')
