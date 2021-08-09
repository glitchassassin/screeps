import { BehaviorResult } from "Behaviors/Behavior";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes, spawnMinion } from "Minions/minionTypes";
import profiler from "screeps-profiler";
import { byId } from "Selectors/byId";
import { calculateNearbyRooms, getRangeTo } from "Selectors/MapCoordinates";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
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
    energyValue(office: string) {
        return -minionCostPerTick(MinionBuilders[MinionTypes.INTERN](spawnEnergyAvailable(office)));
    }
    spawn(office: string, spawns: StructureSpawn[]) {
        const target = 1;
        const actual = this.assigned.map(byId).filter(c => c?.memory.office === office).length

        let spawnQueue = [];

        if (target > actual) {
            spawnQueue.push(spawnMinion(
                office,
                this.id,
                MinionTypes.INTERN,
                MinionBuilders[MinionTypes.INTERN](spawnEnergyAvailable(office))
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
        // Select a target
        if (!creep.memory.exploreTarget) {
            // Ignore aggression on scouts
            creep.notifyWhenAttacked(false);

            let surveyRadius = (Game.rooms[creep.memory.office].controller?.level !== 8) ? 5 : 20

            let rooms = calculateNearbyRooms(creep.memory.office, surveyRadius, false).map(room => ({
                distance: getRangeTo(new RoomPosition(25, 25, creep.memory.office), new RoomPosition(25, 25, room)),
                name: room,
                scanned: Memory.rooms[room]?.scanned
            }));

            if (!rooms.length) return;

            const bestMatch = rooms
                .reduce((last, match) => {
                    // Ignore rooms we've already scanned for now
                    if (last === undefined) return match;
                    if ((match.scanned ?? 0) > (last.scanned ?? 0)) {
                        return last;
                    }
                    if (match.scanned === last.scanned && match.distance < last.distance) {
                        return match;
                    }
                    return match;
                })
            creep.memory.exploreTarget = bestMatch?.name;
        }

        // Do work
        if (creep.memory.exploreTarget) {
            if (!Game.rooms[creep.memory.exploreTarget]) {
                if (moveTo(new RoomPosition(25, 25, creep.memory.exploreTarget), 20)(creep) === BehaviorResult.FAILURE) {
                    Memory.rooms[creep.memory.exploreTarget] ??= { }; // Unable to path
                    Memory.rooms[creep.memory.exploreTarget].scanned = Game.time;
                    delete creep.memory.exploreTarget;
                    return;
                }
            } else {
                const controller = Game.rooms[creep.memory.exploreTarget].controller;
                if (!controller) { // Exploration done
                    delete creep.memory.exploreTarget;
                    return;
                }
                // In room, sign controller
                const result = moveTo(Game.rooms[creep.memory.exploreTarget].controller?.pos, 1)(creep)
                creep.signController(controller, 'This sector property of the Grey Company');
                if (result !== BehaviorResult.INPROGRESS) {
                    // Done, or else no path to controller; abort
                    delete creep.memory.exploreTarget;
                    return;
                }
            }
        }
    }
}

profiler.registerClass(ExploreObjective, 'ExploreObjective')