import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { Metrics } from "screeps-viz";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        maxRoomEnergy?: number
    }
}

/**
 * Writes to blackboard and always returns SUCCESS.
 */
export const calcMaxRoomEnergy = () => (spawn: StructureSpawn, bb: Blackboard) => {
    let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;

    bb.maxRoomEnergy = Math.max(
        spawn.room.energyAvailable ?? 0,
        Metrics.max(statisticsAnalyst.metrics.get(spawn.pos.roomName)!.roomEnergyLevels)[1],
        200 // If all else fails, spawn will regenerate to 200 energy
    );

    return BehaviorResult.SUCCESS;
}
