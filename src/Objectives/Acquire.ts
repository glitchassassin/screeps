import { BehaviorResult } from "Behaviors/Behavior";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes, spawnMinion } from "Minions/minionTypes";
import profiler from "screeps-profiler";
import { byId } from "Selectors/byId";
import { findAcquireTarget, officeShouldClaimAcquireTarget, officeShouldSupportAcquireTarget } from "Selectors/findAcquireTarget";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { profitPerTick } from "Selectors/profitPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        acquireTarget?: Id<StructureController>
    }
}

export class AcquireObjective extends Objective {
    spawnLawyersTarget(office: string) {
        // No need to spawn more than one Lawyer
        return officeShouldClaimAcquireTarget(office) ? 1 : 0
    }
    spawnEngineersTarget(office: string) {
        // Use surplus energy to generate Engineers
        if (!officeShouldSupportAcquireTarget(office)) return 0;
        let surplusIncome = profitPerTick(office, this);
        let build = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(build);
        let fill = (build.filter(p => p === CARRY).length * CARRY_CAPACITY) / CREEP_LIFE_TIME;

        return Math.floor(surplusIncome / (cost + fill))
    }
    energyValue(office: string) {
        if (!officeShouldClaimAcquireTarget(office)) return 0;
        return -minionCostPerTick(MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(office)));
    }
    spawn(office: string, spawns: StructureSpawn[]) {
        const lawyersTarget = this.spawnLawyersTarget(office);
        const engineersTarget = this.spawnEngineersTarget(office);
        const lawyers = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.LAWYER).length
        const engineers = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.ENGINEER).length

        let spawnQueue = [];

        if (lawyersTarget > lawyers) {
            spawnQueue.push(spawnMinion(
                office,
                this.id,
                MinionTypes.LAWYER,
                MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(office))
            ))
        }
        if (engineersTarget > engineers) {
            spawnQueue.push(spawnMinion(
                office,
                this.id,
                MinionTypes.ENGINEER,
                MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office))
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
        if (creep.memory.type === MinionTypes.LAWYER || creep.memory.type === MinionTypes.ENGINEER) {
            this.actions[creep.memory.type](creep);
        }
    }

    actions = {
        [MinionTypes.LAWYER]: (creep: Creep) => {
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
        },
        [MinionTypes.ENGINEER]: (creep: Creep) => {
            const room = findAcquireTarget();
            if (!room) return;
            // Fill up with energy at home office and then reassign
            if (engineerGetEnergy(creep) === BehaviorResult.SUCCESS) {
                creep.memory.office = room;
                creep.memory.objective = 'FacilitiesObjective';
            }
        }
    }
}

profiler.registerClass(AcquireObjective, 'AcquireObjective')