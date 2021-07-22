import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

export const ifNotOccupied = (pos?: RoomPosition) => (creep: Creep, bb: Blackboard) => {
    if (!pos || pos.lookFor(LOOK_CREEPS).some(c => c.id !== creep.id)) {
        return BehaviorResult.FAILURE; // Spot is taken
    }
    return BehaviorResult.SUCCESS; // Spot is free
}
