import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { Budgets } from "Selectors/budgets";
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
    budget(office: string, energy: number) {
        let body = MinionBuilders[MinionTypes.GUARD](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body);
        let count = Math.min(findHostileCreeps(office).length, Math.floor(energy / cost));
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }
    spawnTarget(office: string, budget: number) {
        let body = MinionBuilders[MinionTypes.GUARD](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body);
        return Math.round(budget / cost)
    }
    spawn() {
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id) ?? 0;
            const target = this.spawnTarget(office, budget);
            const actual = this.minions(office).length

            this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: actual})

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
