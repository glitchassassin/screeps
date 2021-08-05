import { BARRIER_LEVEL, BARRIER_TYPES } from "config";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { States, setState } from "Behaviors/states";
import { destroyAdjacentUnplannedStructures, facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";
import { findAcquireTarget, officeShouldSupportAcquireTarget } from "Selectors/findAcquireTarget";

import { BehaviorResult } from "Behaviors/Behavior";
import { Objective } from "./Objective";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { byId } from "Selectors/byId";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { moveTo } from "Behaviors/moveTo";
import { profitPerTick } from "Selectors/profitPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

declare global {
    interface CreepMemory {
        facilitiesTarget?: string;
    }
}

export class FacilitiesObjective extends Objective {
    spawnTarget(office: string) {
        let surplusIncome = profitPerTick(office, this) - 4; // Extra for spawning minions
        const acquireTarget = findAcquireTarget();
        if (office === acquireTarget) {
            return 0; // We are being supported by another office, don't spawn Engineers
        }
        if (acquireTarget && officeShouldSupportAcquireTarget(office)) {
            surplusIncome -= 2 // Adjust available energy for spawning extra Engineers
            surplusIncome += profitPerTick(acquireTarget);
        }
        // Spawn based on maximizing use of available energy
        const workPartsPerEngineer = Math.min(25, Math.floor((spawnEnergyAvailable(office) * 1/2) / 100))
        // const engineerEfficiency = Math.min(0.8, (workPartsPerEngineer * 0.2));
        const engineers = Math.floor(surplusIncome / (UPGRADE_CONTROLLER_POWER * workPartsPerEngineer));
        return engineers;
    }
    energyValue(office: string) {
        const engineers = this.spawnTarget(office);
        const workPartsPerEngineer = Math.min(25, Math.floor((spawnEnergyAvailable(office) * 1/2) / 100))
        const minionCosts = minionCostPerTick(MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office))) * engineers;
        const workCosts = (workPartsPerEngineer * engineers) * UPGRADE_CONTROLLER_POWER;
        return -(workCosts + minionCosts);
    }
    spawn(office: string, spawns: StructureSpawn[]) {
        const target = this.spawnTarget(office);
        // Calculate prespawn time based on time to spawn next minion
        const prespawnTime = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office)).length * CREEP_SPAWN_TIME
        const actual = this.assigned.map(byId).filter(c => (
            c?.memory.office === office && (
                !c.ticksToLive || c.ticksToLive > prespawnTime
            )
        )).length

        let spawnQueue = [];

        if (target > actual) {
            spawnQueue.push((spawn: StructureSpawn) => spawn.spawnCreep(
                MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office)),
                `${MinionTypes.ENGINEER}${Game.time % 10000}`,
                { memory: {
                    type: MinionTypes.ENGINEER,
                    office,
                    objective: this.id,
                }}
            ))
        }

        // Truncate spawn queue to length of available spawns
        spawnQueue = spawnQueue.slice(0, spawns.length);

        // For each available spawn, up to the target number of minions,
        // try to spawn a new minion
        spawnQueue.forEach((spawner, i) => spawner(spawns[i]));

        return spawnQueue.length;
    }

    action = (creep: Creep) => {
        let facilitiesTarget;
        // Check target for completion
        if (creep.memory.facilitiesTarget) {
            facilitiesTarget = PlannedStructure.deserialize(creep.memory.facilitiesTarget)
            if (facilitiesTarget.structure) {
                const rcl = Game.rooms[creep.memory.office].controller?.level ?? 0;
                const maxHits = BARRIER_TYPES.includes(facilitiesTarget.structureType) ? BARRIER_LEVEL[rcl] : facilitiesTarget.structure.hitsMax;
                if (facilitiesTarget.structure.hits >= maxHits) {
                    creep.memory.facilitiesTarget = undefined;
                }
            }
        }

        // Select a target
        if (!creep.memory.facilitiesTarget) {
            const workToDo = facilitiesWorkToDo(creep.memory.office);
            const acquireTarget = findAcquireTarget();
            if (acquireTarget && officeShouldSupportAcquireTarget(creep.memory.office)) {
                workToDo.push(...facilitiesWorkToDo(acquireTarget))
            }
            facilitiesTarget = workToDo.shift();
            if (facilitiesTarget) {
                creep.memory.facilitiesTarget = facilitiesTarget.serialize();
                destroyAdjacentUnplannedStructures(facilitiesTarget.pos.roomName, facilitiesTarget);
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
                const controller = Game.rooms[creep.memory.office].controller
                if (!controller) return;
                moveTo(controller.pos, 3)(creep);
                if (creep.upgradeController(controller) == ERR_NOT_ENOUGH_ENERGY) {
                    setState(States.GET_ENERGY)(creep);
                }
            } else {
                const plan = PlannedStructure.deserialize(creep.memory.facilitiesTarget)

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

