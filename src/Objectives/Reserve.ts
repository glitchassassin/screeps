import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { findReserveTargets } from "Selectors/findReserveTargets";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { controllerPosition } from "Selectors/roomCache";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import profiler from "utils/profiler";
import { FranchiseObjective } from "./Franchise";
import { Objective, Objectives } from "./Objective";


declare global {
    interface CreepMemory {
        /**
         * Name of room to reserve
         */
        reserveTarget?: string,
        arrived?: number
    }
}

export class ReserveObjective extends Objective {
    spawnTarget(office: string) {
        // One for each room with two active remote franchises
        const rooms = new Set<string>();
        for (let o of Object.values(Objectives)) {
            if (
                o instanceof FranchiseObjective &&
                o.office === office &&
                o.assigned.length > 1 &&
                !Memory.offices[posById(o.sourceId)?.roomName ?? ''] &&
                Memory.rooms[posById(o.sourceId)?.roomName ?? '']?.sourceIds?.length === 2
            ) {
                rooms.add(posById(o.sourceId)!.roomName)
            }
        }
        return rooms.size;
    }
    energyValue(office: string) {
        // Minus minion cost, plus average of 30
        const minionCost = minionCostPerTick(MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(office)));
        const reserveBonus = (SOURCE_ENERGY_CAPACITY - SOURCE_ENERGY_NEUTRAL_CAPACITY) * 2 / ENERGY_REGEN_TIME
        return reserveBonus - (minionCost * this.spawnTarget(office))
    }
    spawn() {
        for (let office in Memory.offices) {
            const target = this.spawnTarget(office);
            const marketers = this.assigned.map(byId).filter(c => c?.memory.office === office).length

            let spawnQueue = [];

            if (target > marketers) {
                spawnQueue.push(spawnMinion(
                    office,
                    this.id,
                    MinionTypes.MARKETER,
                    MinionBuilders[MinionTypes.MARKETER](spawnEnergyAvailable(office))
                ))
            }

            // For each available spawn, up to the target number of minions,
            // try to spawn a new minion
            spawnQueue.forEach((spawner, i) => spawner());
        }
    }

    action(creep: Creep) {
        // Select target controller
        if (!creep.memory.reserveTarget) {
            const reserved = new Set<string>();
            for (let id of this.assigned) {
                const creep = byId(id);
                if (
                    creep?.memory.reserveTarget &&
                    (
                        (!creep.ticksToLive || !creep.memory.arrived) ||
                        (creep.ticksToLive < creep.memory.arrived)
                    )
                ) {
                    reserved.add(creep.memory.reserveTarget)
                }
            }
            for (let franchise of findReserveTargets(creep.memory.office)) {
                let room = posById(franchise.sourceId)?.roomName
                if (room && !reserved.has(room)) {
                    creep.memory.reserveTarget = room;
                    break;
                }
            }
        }
        if (!creep.memory.reserveTarget) return;

        const controllerPos = controllerPosition(creep.memory.reserveTarget)
        if (!controllerPos) return;

        // Move to controller
        if (moveTo(controllerPos, 1)(creep) === BehaviorResult.SUCCESS) {
            // Set arrived timestamp when in range
            creep.memory.arrived ??= Game.time;
            // Reserve controller
            const controller = Game.rooms[creep.memory.reserveTarget].controller
            if (controller) creep.reserveController(controller);
        }
    }
}

profiler.registerClass(ReserveObjective, 'ReserveObjective')
