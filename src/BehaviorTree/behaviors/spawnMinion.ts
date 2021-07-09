import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Minion } from "MinionDefinitions/Minion";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        spawnMinionBody?: BodyPartConstant[]
        spawnMinionName?: string
        spawnMinionMemory?: CreepMemory
    }
}

/**
 * Returns FAILURE if variables are not set
 * Returns SUCCESS if minion has spawned
 * Returns INPROGRESS if spawnCreep returns OK, Busy, or Not Enough Energy (to keep trying)
 * Returns FAILURE for any other error
 */
export const spawnMinion = (type: Minion) => (spawn: StructureSpawn, bb: Blackboard) => {
    if (!bb.maxRoomEnergy) return BehaviorResult.FAILURE;
    if (bb.spawnMinionName && Game.creeps[bb.spawnMinionName] && !Game.creeps[bb.spawnMinionName].spawning) {
        // Creep has spawned - disable alerts
        Game.creeps[bb.spawnMinionName].notifyWhenAttacked(false);
        return BehaviorResult.SUCCESS;
    }


    let {body, name, memory} = type.build({office: spawn.pos.roomName}, bb.maxRoomEnergy);

    // Store the name of the minion we're trying to spawn in the Blackboard
    // This way we can confirm if it is being spawned successfully
    // We still want to regenerate the body each round, in case the
    // maxRoomEnergy gets changed
    if (!bb.spawnMinionName) {
        bb.spawnMinionName = name;
    }

    let result = spawn.spawnCreep(body, bb.spawnMinionName, {memory});

    if (
        result === OK ||
        result === ERR_BUSY ||
        result === ERR_NOT_ENOUGH_ENERGY
    ) {
        return BehaviorResult.INPROGRESS;
    }

    return BehaviorResult.FAILURE;
}
