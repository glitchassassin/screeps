import { BehaviorResult } from "Behaviors/Behavior";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { BARRIER_LEVEL, BARRIER_TYPES } from "config";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { byId } from "Selectors/byId";
import { facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { profitPerTick } from "Selectors/profitPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        facilitiesTarget?: string;
    }
}

export class FacilitiesObjective extends Objective {
    spawnTarget(office: string) {
        const rcl = Game.rooms[office]?.controller?.level ?? 0
        let surplusIncome = Math.max(0, profitPerTick(office, this));
        // Spawn based on maximizing use of available energy
        const workPartsPerEngineer = Math.min(16, Math.floor((1/2) * spawnEnergyAvailable(office) / 100))
        const engineersForRepairing = Math.floor(surplusIncome / (REPAIR_COST * REPAIR_POWER * workPartsPerEngineer));
        const engineersForBuilding = Math.max(1, Math.floor(surplusIncome / (BUILD_POWER * workPartsPerEngineer)));

        const work = facilitiesWorkToDo(office);
        const constructionToDo = work.some(s => !s.structure);
        const engineers = constructionToDo ? engineersForBuilding : engineersForRepairing;

        if (rcl < 4) return engineers; // Surplus engineer lifespan will go to upgrading
        if (!work.length) return 0;

        return engineers;
    }
    energyValue(office: string) {
        const engineers = this.spawnTarget(office);
        const workPartsPerEngineer = Math.min(16, Math.floor((1/2) * spawnEnergyAvailable(office) / 100))
        const minionCosts = minionCostPerTick(MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office))) * engineers;
        const constructionToDo = facilitiesWorkToDo(office).some(s => !s.structure);
        const workCosts = (workPartsPerEngineer * engineers) * (constructionToDo ? BUILD_POWER : REPAIR_COST * REPAIR_POWER);
        return -(workCosts + minionCosts);
    }
    spawn() {
        for (const office in Memory.offices) {
            const target = this.spawnTarget(office);
            // Calculate prespawn time based on time to spawn next minion
            const prespawnTime = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office)).length * CREEP_SPAWN_TIME
            const actual = this.assigned.map(byId).filter(c => (
                c?.memory.office === office && (
                    !c.ticksToLive || c.ticksToLive > prespawnTime
                )
            )).length

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
            if (!creep.memory.facilitiesTarget) {
                // No construction - upgrade instead
                const controller = Game.rooms[creep.memory.office]?.controller
                if (!controller) return;
                moveTo(controller.pos, 3)(creep);
                if (creep.upgradeController(controller) == ERR_NOT_ENOUGH_ENERGY) {
                    setState(States.GET_ENERGY)(creep);
                }
            } else {
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
                }
            }
        }
    }
}

profiler.registerClass(FacilitiesObjective, 'FacilitiesObjective')
