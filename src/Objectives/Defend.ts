import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes, spawnMinion } from "Minions/minionTypes";
import { byId } from "Selectors/byId";
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
        return Game.rooms[office].find(FIND_HOSTILE_CREEPS).length
    }
    spawn(office: string, spawns: StructureSpawn[]) {
        const target = Game.rooms[office].find(FIND_HOSTILE_CREEPS).length;
        const actual = this.assigned.map(byId).filter(c => c?.memory.office === office).length

        let spawnQueue = [];

        if (target > actual) {
            spawnQueue.push(spawnMinion(
                office,
                this.id,
                MinionTypes.GUARD,
                MinionBuilders[MinionTypes.GUARD](spawnEnergyAvailable(office))
            ))
        }

        // Truncate spawn queue to length of available spawns
        spawnQueue = spawnQueue.slice(0, spawns.length);

        // For each available spawn, up to the target number of minions,
        // try to spawn a new minion
        spawnQueue.forEach((spawner, i) => spawner(spawns[i]));

        return spawnQueue.length;
    }

    action(creep: Creep) {
        // Find the nearest enemy creep, and move to the closest rampart
        const target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (!target) return; // No targets
        const plan = roomPlans(creep.memory.office)?.office;
        if (!plan) return;
        const defensePositions = [
            ...plan.perimeter.ramparts,
            ...plan.franchise1.ramparts,
            ...plan.franchise2.ramparts,
        ];

        // Try to attack
        creep.attack(target)

        // Move to the closest rampart to the target
        let closest;
        let closestDistance = Infinity;
        for (let rampart of defensePositions) {
            if (rampart.pos.lookFor(LOOK_CREEPS).filter(c => c.id !== creep.id).length) continue; // Rampart already occupied
            if (!closest || rampart.pos.getRangeTo(target.pos) < closestDistance) {
                closest = rampart.pos;
            }
        }
        moveTo(closest, 0)(creep)
    }
}

profiler.registerClass(DefendObjective, 'DefendObjective')
