import { moveTo } from "Behaviors/moveTo";
import { Budgets } from "Budgets";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { findHostileTargetsInOfficeOrTerritories } from "Selectors/findHostileCreeps";
import { getClosestByRange } from "Selectors/MapCoordinates";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
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
        let body = MinionBuilders[MinionTypes.JANITOR](Game.rooms[office].energyCapacityAvailable);
        let cost = minionCostPerTick(body);
        let count = Math.min(findHostileTargetsInOfficeOrTerritories(office).length, Math.floor(energy / cost));
        count = isNaN(count) ? 0 : count;
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count,
        }
    }
    spawnTarget(office: string, budget: number) {
        let body = MinionBuilders[MinionTypes.JANITOR](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body);
        return Math.round(budget / cost)
    }
    spawn() {
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;
            const target = this.spawnTarget(office, budget);
            const actual = this.minions(office).length

            this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: actual})

            let spawnQueue = [];

            if (target > actual) {
                spawnQueue.push(spawnMinion(
                    office,
                    this.id,
                    MinionTypes.GUARD,
                    MinionBuilders[MinionTypes.JANITOR](spawnEnergyAvailable(office))
                ))
            }

            // For each available spawn, up to the target number of minions,
            // try to spawn a new minion
            spawnQueue.forEach((spawner, i) => this.recordEnergyUsed(office, spawner()));
        }
    }

    action(creep: Creep) {
        // Find the nearest enemy creep in our territories
        const target = getClosestByRange(creep.pos, findHostileTargetsInOfficeOrTerritories(creep.memory.office));

        // If no targets, stand guard in central office
        if (!target) {
            moveTo(new RoomPosition(25, 25, creep.memory.office), 20)(creep);
            return;
        }

        // Otherwise, try to attack target
        creep.rangedAttack(target);
        creep.heal(creep);
        moveTo(target.pos, 3)(creep);
    }
}

profiler.registerClass(DefendObjective, 'DefendObjective')
