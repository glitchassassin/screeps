import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { findClosestHostileCreepByRange, findHostileCreeps } from "Selectors/findHostileCreeps";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        exploreTarget?: string;
    }
    interface RoomMemory {
        scanned?: number;
    }
}

export class DefendObjective extends Objective {
    energyValue(office: string) {
        return -(this.spawnTarget(office) * minionCostPerTick(MinionBuilders[MinionTypes.GUARD](spawnEnergyAvailable(office))));
    }
    spawnTarget(office: string) {
        return findHostileCreeps(office).length
    }
    spawn() {
        for (let office in Memory.offices) {
            const target = this.spawnTarget(office);
            const actual = this.minions(office).length

            let spawnQueue = [];

            if (target > actual) {
                spawnQueue.push(spawnMinion(
                    office,
                    this.id,
                    MinionTypes.GUARD,
                    MinionBuilders[MinionTypes.GUARD](spawnEnergyAvailable(office))
                ))
            }

            // For each available spawn, up to the target number of minions,
            // try to spawn a new minion
            spawnQueue.forEach((spawner, i) => spawner());
        }
    }

    action(creep: Creep) {
        // Find the nearest enemy creep, and move to the closest rampart
        const target = findClosestHostileCreepByRange(creep.pos);
        if (!target) return; // No targets
        const plan = roomPlans(creep.memory.office);
        if (!plan) return;
        const defensePositions = ([] as PlannedStructure[]).concat(
            plan.perimeter?.ramparts ?? [],
            plan.franchise1?.ramparts ?? [],
            plan.franchise2?.ramparts ?? [],
        );

        // Try to attack
        creep.attack(target)

        // Move to the closest rampart to the target
        let closest;
        let closestDistance = Infinity;
        for (let rampart of defensePositions) {
            if (rampart.pos.lookFor(LOOK_CREEPS).filter(c => c.id !== creep.id).length) continue; // Rampart already occupied
            if (!closest || rampart.pos.getRangeTo(target.pos) < closestDistance) {
                closest = rampart.pos;
                closestDistance = rampart.pos.getRangeTo(target.pos);
            }
        }
        moveTo(closest, 0)(creep)
    }
}

profiler.registerClass(DefendObjective, 'DefendObjective')
