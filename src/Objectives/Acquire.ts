import { BehaviorResult } from "Behaviors/Behavior";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { moveTo } from "Behaviors/moveTo";
import { Budgets } from "Budgets";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { findAcquireTarget, officeShouldClaimAcquireTarget, officeShouldSupportAcquireTarget } from "Selectors/findAcquireTarget";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
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
    spawnLawyersTarget(office: string, budget: number) {
        // No need to spawn more than one Lawyer
        return (officeShouldClaimAcquireTarget(office) &&
            minionCostPerTick(MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(office))) <= budget) ?
            1 :
            0
    }
    spawnEngineersTarget(office: string, budget: number) {
        // Use surplus energy to generate Engineers
        if (!officeShouldSupportAcquireTarget(office)) return 0;
        let build = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(build);
        let fill = (build.filter(p => p === CARRY).length * CARRY_CAPACITY) / CREEP_LIFE_TIME;

        return Math.floor(budget / (cost + fill))
    }
    budget(office: string, energy: number) {
        if (officeShouldClaimAcquireTarget(office)) {
            let body = MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(office));
            let cost = minionCostPerTick(body)
            return {
                cpu: 0.5,
                spawn: body.length * CREEP_SPAWN_TIME,
                energy: cost,
            }
        } else if (officeShouldSupportAcquireTarget(office)) {
            let body = MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office));
            let cost = minionCostPerTick(body)
            let count = Math.floor(energy / cost)
            return {
                cpu: 0.5 * count,
                spawn: body.length * CREEP_SPAWN_TIME * count,
                energy: cost * count,
            }
        } else {
            return {
                cpu: 0,
                spawn: 0,
                energy: 0
            }
        }
    }
    _indexer(creep: Creep) {
        return creep.memory.office + creep.memory.type
    }
    spawn() {
        const acquireTarget = findAcquireTarget();
        if (!acquireTarget) return;

        // For each office:
        //   If this office is the closest, and officeShouldClaim, spawn up to one lawyer
        //   If this office is in range, and officeShouldSupport, spawn up to target Engineers
        for (let office in Memory.offices) {
            let spawnQueue = [];

            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;

            if (officeShouldClaimAcquireTarget(office)) {
                const lawyersTarget = this.spawnLawyersTarget(office, budget);
                const lawyers = this.minions(office + MinionTypes.LAWYER).length

                this.metrics.set(office, {spawnQuota: lawyersTarget, energyBudget: budget, minions: lawyers})

                if (lawyersTarget > lawyers) {
                    spawnQueue.push(spawnMinion(
                        office,
                        this.id,
                        MinionTypes.LAWYER,
                        MinionBuilders[MinionTypes.LAWYER](spawnEnergyAvailable(office))
                    ))
                }
            } else if (officeShouldSupportAcquireTarget(office)) {
                const engineersTarget = this.spawnEngineersTarget(office, budget);
                const engineers = this.minions(office + MinionTypes.ENGINEER).length +
                    Objectives['FacilitiesObjective'].minions(acquireTarget).length

                this.metrics.set(office, {spawnQuota: engineersTarget, energyBudget: budget, minions: engineers})

                if (engineersTarget > engineers) {
                    spawnQueue.push(spawnMinion(
                        office,
                        this.id,
                        MinionTypes.ENGINEER,
                        MinionBuilders[MinionTypes.ENGINEER](spawnEnergyAvailable(office))
                    ))
                }
            } else {
                this.metrics.set(office, {spawnQuota: 0, energyBudget: budget, minions: this.minions(office).length})
            }

            spawnQueue.forEach((spawner, i) => spawner());
        }
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
