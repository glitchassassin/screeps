import { TaskAction, TaskActionResult } from "../TaskAction";

import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { TerritoryIntelligence } from "Office/RoomIntelligence";
import { travel } from "../activity/Travel";

export class DefenseTask extends TaskAction {
    message = "⚔";
    capacity = 1000;

    constructor(
        public territory: TerritoryIntelligence,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[DefenseTask: ${this.territory.name}]`
    }

    valid() {
        // Once territory is no longer hostile or no longer worthwhile, abort

        return (this.territory.intent === 'DEFEND' || this.territory.intent === 'ACQUIRE')
    }

    canBeFulfilledBy(creep: CachedCreep) {
        return creep.gameObj.getActiveBodyparts(ATTACK) > 0;
    }

    action(creep: CachedCreep): TaskActionResult {
        if (creep.pos.roomName !== this.territory.name) {
            travel(creep, new RoomPosition(25, 25, this.territory.name));
            return TaskActionResult.INPROGRESS;
        }
        let room = Game.rooms[this.territory.name];
        // Hunt enemy minions first
        let hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (hostile) {
            let result = creep.gameObj.attack(hostile);
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, hostile.pos, 1);
            }
            return TaskActionResult.INPROGRESS;
        }
        // Then power creeps
        let hostilePC = creep.pos.findClosestByRange(FIND_HOSTILE_POWER_CREEPS);
        if (hostilePC) {
            let result = creep.gameObj.attack(hostilePC);
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, hostilePC.pos, 1);
            }
            return TaskActionResult.INPROGRESS;
        }
        // Then destroy enemy spawns
        let hostileSpawn = creep.pos.findClosestByRange(FIND_HOSTILE_SPAWNS);
        if (hostileSpawn) {
            let result = creep.gameObj.attack(hostileSpawn);
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, hostileSpawn.pos, 1);
            }
            return TaskActionResult.INPROGRESS;
        }
        // Then destroy enemy invader cores
        let hostileCore = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES, {filter: {structureType: STRUCTURE_INVADER_CORE}});
        if (hostileCore) {
            let result = creep.gameObj.attack(hostileCore);
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, hostileCore.pos, 1);
            }
            return TaskActionResult.INPROGRESS;
        }
        // Otherwise, action complete
        this.done = true;
        return TaskActionResult.SUCCESS;
    }
}
