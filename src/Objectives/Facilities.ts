import { BehaviorResult } from "Behaviors/Behavior";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { Budgets } from "Budgets";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { costPerEngineer } from "Selectors/costPerEngineer";
import { constructionToDo, facilitiesEfficiency, facilitiesWorkToDo, plannedStructureNeedsWork } from "Selectors/facilitiesWorkToDo";
import { getStorageBudget } from "Selectors/getStorageBudget";
import { rcl } from "Selectors/rcl";
import { repairCostsPerTick } from "Selectors/repairCostsPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        facilitiesTarget?: string;
    }
}

const CONSTRUCTION_EFFICIENCY = 0.5;
const UPGRADE_EFFICIENCY = 1;

export class FacilitiesObjective extends Objective {
    spawnTarget(office: string, budget: number) {
        const work = facilitiesWorkToDo(office);
        const cost = costPerEngineer(Game.rooms[office].energyCapacityAvailable, Math.round(facilitiesEfficiency(office)));
        // const workPartsPerEngineer = Math.min(16, Math.floor((1/2) * Game.rooms[office].energyCapacityAvailable / 100))

        const construction = constructionToDo(office).length > 0;
        const repairs = repairCostsPerTick(office);

        const constructionEngineers = Math.floor(budget / cost)
        const engineers = Math.min(constructionEngineers, construction ? constructionEngineers : Math.ceil(repairs * 10))

        // console.log(surplusIncome, cost, engineers)

        // let storageSurplus = Math.floor((storageEnergyAvailable(office) * 1.5 * workPartsPerEngineer) / (cost * CREEP_LIFE_TIME));

        // if (rcl(office) < 3) return engineers + storageSurplus; // Surplus engineer lifespan will go to upgrading
        // if (rcl(office) > 1 && work.length === 0) return 0;

        return Math.max(1, engineers);
    }
    budget(office: string, energy: number) {
        let body = MinionBuilders[MinionTypes.ENGINEER](Game.rooms[office].energyCapacityAvailable);
        let cost = costPerEngineer(Game.rooms[office].energyCapacityAvailable, Math.round(facilitiesEfficiency(office)));

        const construction = constructionToDo(office).length > 0;
        const repairs = repairCostsPerTick(office);

        const constructionEngineers = Math.floor(energy / cost)
        // console.log(construction, repairs, constructionEngineers, energy, cost)
        let count = Math.min(constructionEngineers, construction ? constructionEngineers : Math.ceil(repairs * 10))
        count = isNaN(count) ? 0 : count;

        if (rcl(office) > 1 && facilitiesWorkToDo(office).length === 0) count = 0;
        // console.log(office, body.length, cost, count)
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }
    spawn() {
        for (const office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;
            const target = this.spawnTarget(office, budget);
            // Calculate prespawn time based on time to spawn next minion
            const prespawnTime = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office)).length * CREEP_SPAWN_TIME
            const actual = this.minions(office).filter(c => (
                    !c.ticksToLive || c.ticksToLive > prespawnTime
            )).length

            // console.log('facilities', office, target, actual)

            this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: actual})

            if (target > actual) {
                this.recordEnergyUsed(office, spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ENGINEER,
                    MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office))
                )())
            }
        }
    }

    action(creep: Creep) {
        let facilitiesTarget;
        // Check target for completion
        if (creep.memory.facilitiesTarget) {
            facilitiesTarget = PlannedStructure.deserialize(creep.memory.facilitiesTarget)
            if (!plannedStructureNeedsWork(facilitiesTarget, 1.0)) {
                creep.memory.facilitiesTarget = undefined;
            }
        }

        // Select a target
        if (!creep.memory.facilitiesTarget) {
            const workToDo = facilitiesWorkToDo(creep.memory.office);
            facilitiesTarget = workToDo.shift();
            if (facilitiesTarget) {
                creep.memory.facilitiesTarget = facilitiesTarget.serialize();
            }
        }

        // Do work
        if (!creep.memory.state || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.GET_ENERGY)(creep);
        }
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.WORKING)(creep);
        }
        if (creep.memory.state === States.GET_ENERGY) {
            if (engineerGetEnergy(creep, facilitiesTarget?.pos.roomName) === BehaviorResult.SUCCESS) {
                setState(States.WORKING)(creep);
            }
        }
        if (creep.memory.state === States.WORKING) {
            if (
                !creep.memory.facilitiesTarget &&
                (
                    rcl(creep.memory.office) < 4 ||
                    storageEnergyAvailable(creep.memory.office) > getStorageBudget(creep.memory.office)
                )
            ) {
                // No construction - upgrade instead
                const controller = Game.rooms[creep.memory.office]?.controller
                if (!controller) return;
                moveTo(controller.pos, 3)(creep);
                if (creep.upgradeController(controller) == ERR_NOT_ENOUGH_ENERGY) {
                    setState(States.GET_ENERGY)(creep);
                }
            } else if (creep.memory.facilitiesTarget) {
                const plan = PlannedStructure.deserialize(creep.memory.facilitiesTarget)
                // console.log(creep.name, plan.pos, plan.structureType)

                if (moveTo(plan.pos, 3)(creep) === BehaviorResult.SUCCESS) {
                    if (plan.structure) {
                        if (creep.repair(plan.structure) === OK) {
                            this.recordEnergyUsed(creep.memory.office, (REPAIR_COST * REPAIR_POWER) * creep.body.filter(p => p.type === WORK).length);
                        }
                    } else {
                        // Create construction site if needed
                        plan.pos.createConstructionSite(plan.structureType)
                        // Shove creeps out of the way if needed
                        if ((OBSTACLE_OBJECT_TYPES as string[]).includes(plan.structureType)) {
                            plan.pos.lookFor(LOOK_CREEPS)[0]?.giveWay();
                        }
                        if (plan.constructionSite) {
                            if (creep.build(plan.constructionSite) === OK) {
                                this.recordEnergyUsed(creep.memory.office, BUILD_POWER * creep.body.filter(p => p.type === WORK).length);
                            }
                        }
                    }
                    plan.survey()
                }
            }
        }
    }
}

profiler.registerClass(FacilitiesObjective, 'FacilitiesObjective')
