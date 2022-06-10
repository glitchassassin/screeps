import { moveTo } from "Behaviors/moveTo";
import { States } from "Behaviors/states";
import { Budgets } from "Budgets";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { calculateNearbyRooms } from "Selectors/MapCoordinates";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageStructureThatNeedsEnergy } from "Selectors/storageStructureThatNeedsEnergy";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        targetRoom?: string,
        plunderTarget?: Id<AnyStoreStructure>
    }
}


const shouldPlunder = (office: string) => (room: string) => {
    if (roomPlans(office)?.headquarters?.terminal) return Boolean(Memory.rooms[room]?.hasLootEnergy || Memory.rooms[room]?.hasLootResources);
    return Boolean(Memory.rooms[room]?.hasLootEnergy);
}

export class PlunderObjective extends Objective {
    budget(office: string, energy: number) {
        if (!calculateNearbyRooms(office, 3, false).some(shouldPlunder(office))) return {
            cpu: 0,
            spawn: 0,
            energy: 0,
        }
        let body = MinionBuilders[MinionTypes.ACCOUNTANT](Game.rooms[office].energyCapacityAvailable, 50, false);
        let cost = minionCostPerTick(body);
        let count = Math.ceil(energy / cost);
        count = isNaN(count) || !isFinite(count) ? 0 : count;
        // console.log(energy, cost, count)
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }
    spawn() {
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;

            let body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, false);
            let cost = minionCostPerTick(body);
            let target = Math.ceil(budget / cost);

            this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: this.minions(office).length})

            if (this.minions(office).length < target) {
                this.recordEnergyUsed(office, spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 50, false)
                )())
            }
        }
    }

    action(creep: Creep) {
        if (creep.memory.state === States.WITHDRAW) {
            if (creep.store.getFreeCapacity() === 0) creep.memory.state = States.DEPOSIT;

            creep.memory.targetRoom ??= calculateNearbyRooms(creep.memory.office, 3, false).find(shouldPlunder(creep.memory.office));
            if (!creep.memory.targetRoom) return;

            if (creep.pos.roomName !== creep.memory.targetRoom) {
                moveTo(new RoomPosition(25, 25, creep.memory.targetRoom), 20)(creep);
                return;
            }

            creep.memory.plunderTarget ??= Game.rooms[creep.memory.targetRoom]
                .find(
                    FIND_HOSTILE_STRUCTURES,
                    { filter: s => 'store' in s && Object.keys(s.store).length }
                )[0]?.id as Id<AnyStoreStructure>

            if (!creep.memory.plunderTarget) {
                creep.memory.targetRoom = undefined;
                if (creep.store.getUsedCapacity() > 0) creep.memory.state = States.DEPOSIT;
                return;
            }

            const target = byId(creep.memory.plunderTarget);
            const targetResource = target && Object.keys(target.store)[0] as ResourceConstant|undefined;
            if (targetResource && creep.withdraw(target, targetResource) === ERR_NOT_IN_RANGE) {
                moveTo(target.pos)(creep);
                return;
            }
        }
        if (creep.memory.state === States.DEPOSIT) {
            if (creep.store.getUsedCapacity() === 0) creep.memory.state = States.DEPOSIT;
            const storage = storageStructureThatNeedsEnergy(creep.memory.office);
            const terminal = roomPlans(creep.memory.office)?.headquarters?.terminal.structure;
            const nonEnergyResource = Object.keys(creep.store).find(c => c !== RESOURCE_ENERGY) as ResourceConstant;
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) && storage && creep.transfer(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                moveTo(storage.pos)(creep);
                return;
            } else if (nonEnergyResource && terminal && creep.transfer(terminal, nonEnergyResource) === ERR_NOT_IN_RANGE) {
                moveTo(terminal.pos)(creep);
                return;
            }
        }

    }
}

profiler.registerClass(PlunderObjective, 'PlunderObjective')
