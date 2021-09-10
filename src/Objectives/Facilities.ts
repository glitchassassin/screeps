import { BehaviorResult } from "Behaviors/Behavior";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { BARRIER_LEVEL, BARRIER_TYPES } from "config";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { Budgets } from "Selectors/budgets";
import { facilitiesEfficiency, facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
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
    costPerEngineer(energy: number, efficiency: number) {
        const engineer = MinionBuilders[MinionTypes.ENGINEER](energy);
        const workPartsPerEngineer = engineer.filter(p => p === WORK).length;
        const minionCost = minionCostPerTick(engineer);
        // console.log('efficiency', efficiency)

        // const constructionToDo = work.length > 0 ? work.filter(s => !s.structure).length / work.length : 0;
        // const repairToDo = 1 - constructionToDo;
        // const workCosts = (workPartsPerEngineer) * (constructionToDo * BUILD_POWER + repairToDo * REPAIR_COST * REPAIR_POWER);

        return minionCost + (workPartsPerEngineer * efficiency);
    }
    spawnTarget(office: string, budget: number) {
        const work = facilitiesWorkToDo(office);
        const cost = this.costPerEngineer(Game.rooms[office].energyCapacityAvailable, facilitiesEfficiency(office));
        // const workPartsPerEngineer = Math.min(16, Math.floor((1/2) * Game.rooms[office].energyCapacityAvailable / 100))

        const engineers = Math.floor(budget / cost)

        // console.log(surplusIncome, cost, engineers)

        // let storageSurplus = Math.floor((storageEnergyAvailable(office) * 1.5 * workPartsPerEngineer) / (cost * CREEP_LIFE_TIME));

        // if (rcl(office) < 3) return engineers + storageSurplus; // Surplus engineer lifespan will go to upgrading
        if (work.length === 0) return 0;

        return Math.max(1, engineers);
    }
    budget(office: string, energy: number) {
        let body = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office));
        let cost = this.costPerEngineer(Game.rooms[office].energyCapacityAvailable, facilitiesEfficiency(office));
        let count = Math.max(1, Math.floor(energy / cost));
        if (facilitiesWorkToDo(office).length === 0) count = 0;
        // console.log(office, body.length, cost, count)
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }
    spawn() {
        for (const office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id) ?? 0;
            const target = this.spawnTarget(office, budget);
            // Calculate prespawn time based on time to spawn next minion
            const prespawnTime = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office)).length * CREEP_SPAWN_TIME
            const actual = this.minions(office).filter(c => (
                    !c.ticksToLive || c.ticksToLive > prespawnTime
            )).length

            // console.log('facilities', office, target, actual)

            this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: actual})

            if (target > actual) {
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ENGINEER,
                    MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office))
                )()
            }
        }
    }

    action(creep: Creep) {
        let facilitiesTarget;
        // Check target for completion
        if (creep.memory.facilitiesTarget) {
            facilitiesTarget = PlannedStructure.deserialize(creep.memory.facilitiesTarget)
            if (facilitiesTarget.structure) {
                const rcl = Game.rooms[creep.memory.office]?.controller?.level ?? 0;
                const maxHits = BARRIER_TYPES.includes(facilitiesTarget.structureType) ? BARRIER_LEVEL[rcl] : facilitiesTarget.structure.hitsMax;
                if (facilitiesTarget.structure.hits >= maxHits) {
                    creep.memory.facilitiesTarget = undefined;
                }
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
            if (!creep.memory.facilitiesTarget && (Game.rooms[creep.memory.office].controller?.level ?? 0) < 4) {
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
                        creep.repair(plan.structure);
                    } else {
                        // Create construction site if needed
                        plan.pos.createConstructionSite(plan.structureType)
                        // Shove creeps out of the way if needed
                        if ((OBSTACLE_OBJECT_TYPES as string[]).includes(plan.structureType)) {
                            plan.pos.lookFor(LOOK_CREEPS)[0]?.giveWay();
                        }
                        if (plan.constructionSite) {
                            creep.build(plan.constructionSite);
                        }
                    }
                    plan.survey()
                }
            }
        }
    }
}

profiler.registerClass(FacilitiesObjective, 'FacilitiesObjective')
