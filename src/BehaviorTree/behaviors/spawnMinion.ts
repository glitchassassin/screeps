import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedSpawn } from "WorldState";
import { Minion } from "MinionDefinitions/Minion";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        spawnMinionBody?: BodyPartConstant[]
        spawnMinionName?: string
        spawnMinionMemory?: CreepMemory
    }
}

export const spawnMinion = (type: Minion) => (spawn: CachedSpawn, bb: Blackboard) => {
    if (!bb.maxRoomEnergy) return BehaviorResult.FAILURE;
    if (bb.spawnMinionName && Game.creeps[bb.spawnMinionName] && !Game.creeps[bb.spawnMinionName].spawning) return BehaviorResult.SUCCESS;


    let {body, name, memory} = type.build({office: spawn.pos.roomName}, bb.maxRoomEnergy);

    // Store the name of the minion we're trying to spawn in the Blackboard
    // This way we can confirm if it is being spawned successfully
    // We still want to regenerate the body each round, in case the
    // maxRoomEnergy gets changed
    if (!bb.spawnMinionName) {
        bb.spawnMinionName = name;
    }

    let result = spawn.gameObj?.spawnCreep(body, bb.spawnMinionName, {memory});

    if (
        result === OK ||
        result === ERR_BUSY ||
        result === ERR_NOT_ENOUGH_ENERGY
    ) {
        return BehaviorResult.INPROGRESS;
    }

    return BehaviorResult.FAILURE;
}
