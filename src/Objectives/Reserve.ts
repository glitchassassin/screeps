import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { findReserveTargets } from "Selectors/findReserveTargets";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { controllerPosition } from "Selectors/roomCache";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


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
        if (Game.rooms[office].energyCapacityAvailable < 650) return 0;
        // One for each room with an active remote franchise
        return findReserveTargets(office).size;
    }
    budget(office: string, energy: number) {
        let body = MinionBuilders[MinionTypes.MARKETER](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body);
        let count = Math.min(Math.floor(energy / cost), this.spawnTarget(office))
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }
    spawn() {
        for (let office in Memory.offices) {
            const target = this.spawnTarget(office);
            const marketers = this.minions(office).length;

            let spawnQueue = [];

            this.metrics.set(office, {spawnQuota: target, minions: marketers})

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
            for (let c of this.minions(creep.memory.office)) {
                if (
                    c?.memory.reserveTarget &&
                    (
                        (!c.ticksToLive || !c.memory.arrived) ||
                        (c.ticksToLive < c.memory.arrived)
                    )
                ) {
                    reserved.add(c.memory.reserveTarget)
                }
            }
            for (let room of findReserveTargets(creep.memory.office)) {
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
