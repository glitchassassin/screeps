import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { approximateExtensionsCapacity, roomHasExtensions } from "Selectors/getExtensionsCapacity";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { getExtensions } from "Selectors/spawnsAndExtensionsDemand";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        refillTarget?: string
    }
}

const cachedRefillTargets = new Map<string, PlannedStructure>();

/**
 * Picks up energy from Sources and transfers it to Storage
 */
export class RefillExtensionsObjective extends Objective {
    energyValue(office: string) {
        return -(this.targetCarry(office) * 1.5 * BODYPART_COST[CARRY]) / CREEP_LIFE_TIME
    }
    targetCarry(office: string) {
        // Calculate extensions capacity
        let capacity = approximateExtensionsCapacity(office)

        // Maintain up to three Accountants (at max level) to refill extensions
        return Math.min(32 * 3, Math.ceil(capacity / CARRY_CAPACITY));
    }
    _assignedCarryCache = new Map<string, [number, number]>();
    getCarryCapacityByOffice(office: string) {
        return this.minions(office).filter(c => !c.ticksToLive || c.ticksToLive > 100).reduce((sum, c) => sum + (c?.getActiveBodyparts(CARRY) ?? 0), 0);
    }
    spawn() {
        for (let office in Memory.offices) {
            if (storageEnergyAvailable(office) === 0) continue; // Only spawn refillers if we have energy available

            if (!roomHasExtensions(office)) continue; // No extensions
            const targetCarry = this.targetCarry(office);
            const actualCarry = this.getCarryCapacityByOffice(office);

            if (actualCarry === 0 && Game.rooms[office].energyAvailable >= 300) {
                // Emergency refiller
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](300, targetCarry)
                )({ preferredSpawn: roomPlans(office)?.headquarters?.spawn.structure as StructureSpawn })
            } else if (actualCarry < targetCarry) {
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), targetCarry)
                )({ preferredSpawn: roomPlans(office)?.headquarters?.spawn.structure as StructureSpawn })
            }
        }
    }

    action(creep: Creep) {

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
            // Short-circuit if everything is full
            if (Game.rooms[creep.memory.office]?.energyAvailable === Game.rooms[creep.memory.office]?.energyCapacityAvailable) return;

            if (!creep.memory.refillTarget) {
                for (let s of getExtensions(creep.memory.office)) {
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

            const target = cachedRefillTargets.get(creep.memory.refillTarget) ?? PlannedStructure.deserialize(creep.memory.refillTarget);
            cachedRefillTargets.set(creep.memory.refillTarget, target)

            if (!target.structure || (target.structure as StructureExtension).store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                // Re-target
                creep.memory.refillTarget = undefined;
                return;
            }

            // Cleanup
            const tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 1).shift()
            if (tombstone) creep.withdraw(tombstone, RESOURCE_ENERGY)
            const res = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: RESOURCE_ENERGY }).shift()
            if (res) creep.pickup(res)

            if (moveTo(target.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                creep.transfer(target.structure, RESOURCE_ENERGY);
                creep.memory.refillTarget = undefined;
                return;
            }
        }
    }
}

profiler.registerClass(RefillExtensionsObjective, 'RefillExtensionsObjective')
