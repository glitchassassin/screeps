import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { Budgets } from "Budgets";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { calculateLogisticsThroughput } from "Selectors/calculateLogisticsThroughput";
import { franchiseIncomePerTick } from "Selectors/franchiseStatsPerTick";
import { getPatrolRoute } from "Selectors/getPatrolRoute";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";
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

export class ExploreObjective extends Objective {
    budget(office: string, energy: number) {
        let body = MinionBuilders[MinionTypes.AUDITOR](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body);
        return {
            cpu: 0.5,
            spawn: body.length * CREEP_SPAWN_TIME,
            energy: cost,
        }
    }
    public hasFixedBudget(office: string) {
        return true;
    }
    spawn() {
        for (const office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;
            if (getTerritoryIntent(office) === TerritoryIntent.DEFEND) return;
            if (franchiseIncomePerTick(office) <= 0 || calculateLogisticsThroughput(office) <= 0) return;
            let body = MinionBuilders[MinionTypes.AUDITOR](spawnEnergyAvailable(office));
            let cost = minionCostPerTick(body);
            const target = (budget >= cost) ? 1 : 0;
            const actual = this.minions(office).length;

            this.metrics.set(office, {spawnQuota: target, energyBudget: budget, minions: actual})

            let spawnQueue = [];

            if (target > actual) {
                spawnQueue.push(spawnMinion(
                    office,
                    this.id,
                    MinionTypes.AUDITOR,
                    MinionBuilders[MinionTypes.AUDITOR](spawnEnergyAvailable(office))
                ))
            }

            // For each available spawn, up to the target number of minions,
            // try to spawn a new minion
            spawnQueue.forEach((spawner, i) => spawner());
        }
    }

    action(creep: Creep) {
        // Select a target
        if (!creep.memory.exploreTarget) {
            // Ignore aggression on scouts
            creep.notifyWhenAttacked(false);

            let rooms = getPatrolRoute(creep.memory.office).map(room => ({
                name: room,
                scanned: Memory.rooms[room]?.scanned
            }));

            if (!rooms.length) return;

            const bestMatch = rooms
                .reduce((last, match) => {
                    // Ignore rooms we've already scanned for now
                    if (last === undefined) return match;
                    if ((match.scanned ?? 0) >= (last.scanned ?? 0)) {
                        return last;
                    }
                    return match;
                })
            creep.memory.exploreTarget = bestMatch?.name;
        }

        // Do work
        if (creep.memory.exploreTarget) {
            if (!Game.rooms[creep.memory.exploreTarget]) {
                if (moveTo(new RoomPosition(25, 25, creep.memory.exploreTarget), 20)(creep) === BehaviorResult.FAILURE) {
                    // console.log('Failed to path', creep.pos, creep.memory.exploreTarget);
                    Memory.rooms[creep.memory.exploreTarget] ??= { }; // Unable to path
                    Memory.rooms[creep.memory.exploreTarget].scanned = Game.time;
                    delete creep.memory.exploreTarget;
                    return;
                }
            } else {
                const controller = Game.rooms[creep.memory.exploreTarget].controller;
                if (creep.pos.roomName === creep.memory.exploreTarget && controller && controller.sign?.username !== 'LordGreywether') {
                    // Room is visible, creep is in room
                    // In room, sign controller
                    const result = moveTo(controller.pos, 1)(creep)
                    creep.signController(controller, 'This sector property of the Grey Company');
                    if (result === BehaviorResult.INPROGRESS) return;
                    // otherwise, successful or no path found
                }
                delete creep.memory.exploreTarget;
                return;
            }
        }
    }
}

profiler.registerClass(ExploreObjective, 'ExploreObjective')
