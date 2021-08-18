import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { byId } from "Selectors/byId";
import { franchiseIncomePerTick } from "Selectors/franchiseIncomePerTick";
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

/**
 * Picks up energy from Sources and transfers it to Storage
 */
export class RefillExtensionsObjective extends Objective {
    energyValue(office: string) {
        return -(this.targetCarry(office) * 1.5 * BODYPART_COST[CARRY]) / CREEP_LIFE_TIME
    }
    targetCarry(office: string) {
        // Calculate extensions capacity
        let capacity = roomPlans(office)?.extensions?.extensions
            .reduce((sum, e) => sum + ((e.structure as StructureExtension)?.store.getCapacity(RESOURCE_ENERGY) ?? 0), 0) ?? 0

        // Maintain one appropriately-sized Accountant
        return Math.ceil(capacity / CARRY_CAPACITY);
    }
    spawn() {
        for (let office in Memory.offices) {
            if (franchiseIncomePerTick(office) <= 0 && storageEnergyAvailable(office) === 0) continue; // Only spawn refillers if we have energy available

            if (roomPlans(office)?.extensions?.extensions.every(e => !e.structure)) continue; // No extensions
            const targetCarry = this.targetCarry(office);
            const actualCarry = this.assigned.map(byId).filter(c =>
                c?.memory.office === office &&
                (!c.ticksToLive || c.ticksToLive > 100)
            ).reduce((sum, c) => sum + (c?.getActiveBodyparts(CARRY) ?? 0), 0);

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
        // Cleanup
        const tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 1).shift()
        if (tombstone) creep.withdraw(tombstone, RESOURCE_ENERGY)
        const res = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, { filter: RESOURCE_ENERGY }).shift()
        if (res) creep.pickup(res)

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

profiler.registerClass(RefillExtensionsObjective, 'RefillExtensionsObjective')
