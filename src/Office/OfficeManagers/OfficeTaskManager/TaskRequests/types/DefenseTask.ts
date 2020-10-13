import { ShouldDefendRoom } from "Office/OfficeManagers/SecurityManager/Strategists/ShouldDefendRoom";
import { TerritoryIntelligence } from "Office/RoomIntelligence";
import { travel } from "../activity/Travel";
import { TaskAction, TaskActionResult } from "../TaskAction";

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
        return ShouldDefendRoom(this.territory);
    }

    canBeFulfilledBy(creep: Creep) {
        return creep.getActiveBodyparts(ATTACK) > 0;
    }

    action(creep: Creep): TaskActionResult {
        if (creep.pos.roomName !== this.territory.name) {
            travel(creep, new RoomPosition(25, 25, this.territory.name));
            return TaskActionResult.INPROGRESS;
        }
        let room = Game.rooms[this.territory.name];
        // Hunt enemy minions first
        let hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (hostile) {
            let result = creep.attack(hostile);
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, hostile.pos, 1);
            }
            return TaskActionResult.INPROGRESS;
        }
        // Then power creeps
        let hostilePC = creep.pos.findClosestByRange(FIND_HOSTILE_POWER_CREEPS);
        if (hostilePC) {
            let result = creep.attack(hostilePC);
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, hostilePC.pos, 1);
            }
            return TaskActionResult.INPROGRESS;
        }
        // Then destroy enemy spawns
        let hostileSpawn = creep.pos.findClosestByRange(FIND_HOSTILE_SPAWNS);
        if (hostileSpawn) {
            let result = creep.attack(hostileSpawn);
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, hostileSpawn.pos, 1);
            }
            return TaskActionResult.INPROGRESS;
        }
        // Otherwise, action complete
        return TaskActionResult.SUCCESS;
    }
}
