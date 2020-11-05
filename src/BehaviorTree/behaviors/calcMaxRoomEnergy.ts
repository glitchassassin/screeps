import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedSpawn } from "WorldState";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        maxRoomEnergy?: number
    }
}

export const calcMaxRoomEnergy = () => (spawn: CachedSpawn, bb: Blackboard) => {
    let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;

    bb.maxRoomEnergy = Math.max(
        spawn.gameObj?.room.energyAvailable ?? 0,
        statisticsAnalyst.metrics.get(spawn.pos.roomName)?.roomEnergyLevels.max() ?? 0,
        200 // If all else fails, spawn will regenerate to 200 energy
    );

    return BehaviorResult.SUCCESS;
}
