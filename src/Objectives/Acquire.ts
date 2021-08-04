import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { findAcquireTarget, officeShouldClaimAcquireTarget } from "Selectors/findAcquireTarget";

import { BehaviorResult } from "Behaviors/Behavior";
import { Objective } from "./Objective";
import { byId } from "Selectors/byId";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { moveTo } from "Behaviors/moveTo";
import { posById } from "Selectors/posById";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

declare global {
    interface CreepMemory {
        acquireTarget?: Id<StructureController>
    }
}

export class AcquireObjective extends Objective {
    spawnTarget(office: string) {
        // No need to spawn more than one Lawyer
        return officeShouldClaimAcquireTarget(office) ? 1 : 0
    }
    energyValue(office: string) {
        if (!officeShouldClaimAcquireTarget(office)) return 0;
        return -minionCostPerTick(MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(office)));
    }
    spawn(office: string, spawns: StructureSpawn[]) {
        const target = this.spawnTarget(office);
        const actual = this.assigned.map(byId).filter(c => c?.memory.office === office).length

        let spawnQueue = [];

        if (target > actual) {
            spawnQueue.push((spawn: StructureSpawn) => spawn.spawnCreep(
                MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(office)),
                `${MinionTypes.LAWYER}${Game.time % 10000}`,
                { memory: {
                    type: MinionTypes.LAWYER,
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
        if (!creep.memory.acquireTarget) {
            const room = findAcquireTarget();
            if (!room) return;
            creep.memory.acquireTarget = Memory.rooms[room].controllerId;
        }

        if (byId(creep.memory.acquireTarget)?.my) {
            creep.memory.acquireTarget = undefined; // Already claimed this controller
            return;
        }

        const pos = posById(creep.memory.acquireTarget)
        if (!pos) return;

        if (moveTo(pos, 1)(creep) === BehaviorResult.SUCCESS) {
            const controller = byId(creep.memory.acquireTarget)
            if (!controller) return;
            creep.signController(controller, 'This sector property of the Grey Company');
            creep.claimController(controller);
        }
    }
}

