import { BehaviorResult } from "Behaviors/Behavior";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes, spawnMinion } from "Minions/minionTypes";
import { byId } from "Selectors/byId";
import { findAcquireTarget, officeShouldClaimAcquireTarget, officeShouldSupportAcquireTarget } from "Selectors/findAcquireTarget";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { profitPerTick } from "Selectors/profitPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import profiler from "utils/profiler";
import { Objective, Objectives } from "./Objective";


declare global {
    interface CreepMemory {
        acquireTarget?: Id<StructureController>
    }
    interface RoomMemory {
        acquireAttempts?: number
        lastAcquireAttempt?: number
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
        const acquireTarget = findAcquireTarget();
        // console.log(acquireTarget)
        if (!acquireTarget) return 0;
        const lawyersTarget = this.spawnLawyersTarget(office);
        const engineersTarget = this.spawnEngineersTarget(office);
        const lawyers = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.LAWYER).length
        const engineers = this.assigned.map(byId).filter(c => c?.memory.office === office && c.memory.type === MinionTypes.ENGINEER).length +
            Objectives['FacilitiesObjective'].assigned.map(byId).filter(c => c?.memory.office === acquireTarget && c.memory.type === MinionTypes.ENGINEER).length
        // console.log('lawyers', lawyers, lawyersTarget)
        // console.log('engineers', engineers, engineersTarget)

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

                Memory.rooms[room].acquireAttempts = (Memory.rooms[room].acquireAttempts ?? 0) + 1;

                creep.memory.acquireTarget = Memory.rooms[room].controllerId;
            }

            if (creep.memory.acquireTarget && Memory.rooms[creep.memory.acquireTarget]) {
                Memory.rooms[creep.memory.acquireTarget].lastAcquireAttempt = Game.time;
            }

            if (byId(creep.memory.acquireTarget)?.my) {
                creep.memory.acquireTarget = undefined; // Already claimed this controller
                return;
            }

            const pos = posById(creep.memory.acquireTarget)
            if (!pos) return;

            const result = moveTo(pos, 1)(creep);
            if (result === BehaviorResult.SUCCESS) {
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
