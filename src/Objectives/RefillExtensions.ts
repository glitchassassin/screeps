import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { States, setState } from "Behaviors/states";

import { BehaviorResult } from "Behaviors/Behavior";
import { Objective } from "./Objective";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { byId } from "Selectors/byId";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { profitPerTick } from "Selectors/profitPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { spawnsAndExtensions } from "Selectors/spawnsAndExtensionsDemand";

declare global {
    interface CreepMemory {
        refillTarget?: string
    }
}

/**
 * Picks up energy from Sources and transfers it to Storage
 */
export class RefillExtensionsObjective extends Objective {
    energyValue(office: string) {
        return -(this.targetCarry(office) * 1.5 * BODYPART_COST[CARRY]) / CREEP_LIFE_TIME
    }
    targetCarry(office: string) {
        // Calculate extensions capacity
        let capacity = roomPlans(office)?.office?.extensions.extensions
            .reduce((sum, e) => sum + ((e.structure as StructureExtension)?.store.getCapacity(RESOURCE_ENERGY) ?? 0), 0) ?? 0

        // Maintain one appropriately-sized Accountant
        return Math.ceil(capacity / CARRY_CAPACITY);
    }
    spawn(office: string, spawns: StructureSpawn[]) {
        if (profitPerTick(office) <= 0) return 0; // Only spawn refillers if we have active Franchises

        if (roomPlans(office)?.office?.extensions.extensions.every(e => !e.structure)) return 0; // No extensions
        const targetCarry = this.targetCarry(office);
        const actualCarry = this.assigned.map(byId).filter(c =>
            c?.memory.office === office &&
            (!c.ticksToLive || c.ticksToLive > 100)
        ).reduce((sum, c) => sum + (c?.getActiveBodyparts(CARRY) ?? 0), 0);

        let spawnQueue = [];

        if (actualCarry < targetCarry) {
            spawnQueue.push((spawn: StructureSpawn) => spawn.spawnCreep(
                MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), targetCarry),
                `${MinionTypes.ACCOUNTANT}${Game.time % 10000}`,
                { memory: {
                    type: MinionTypes.ACCOUNTANT,
                    office,
                    objective: this.id,
                }}
            ))
        } else if (actualCarry === 0 && Game.rooms[office].energyAvailable >= 300) {
            // Emergency refiller
            spawnQueue.push((spawn: StructureSpawn) => spawn.spawnCreep(
                MinionBuilders[MinionTypes.ACCOUNTANT](Game.rooms[office].energyAvailable, targetCarry),
                `${MinionTypes.ACCOUNTANT}${Game.time % 10000}`,
                { memory: {
                    type: MinionTypes.ACCOUNTANT,
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
        if (!creep.memory.state || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.WITHDRAW)(creep);
        } else if (!creep.memory.state) {
            setState(States.DEPOSIT)(creep);
        }

        if (creep.memory.state === States.WITHDRAW) {
            const result = getEnergyFromStorage(creep)
            if (result === BehaviorResult.SUCCESS) {
                setState(States.DEPOSIT)(creep);
            } else if (result === BehaviorResult.FAILURE) {
                return;
            }
        }
        if (creep.memory.state === States.DEPOSIT) {
            if (!creep.memory.refillTarget) {
                for (let s of spawnsAndExtensions(creep.memory.office)) {
                    if (((s.structure as StructureExtension)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
                        creep.memory.refillTarget = s.serialize();
                        break;
                    }
                }
            }
            if (!creep.memory.refillTarget) {
                // No targets found.
                return
            }

            const target = PlannedStructure.deserialize(creep.memory.refillTarget);
            if (!target.structure || (target.structure as StructureExtension).store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                // Re-target
                creep.memory.refillTarget = undefined;
                return;
            }

            if (moveTo(target.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                creep.transfer(target.structure, RESOURCE_ENERGY);
                creep.memory.refillTarget = undefined;
                return;
            }
        }
    }
}

