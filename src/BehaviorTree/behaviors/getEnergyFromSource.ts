import { Selector, Sequence } from "BehaviorTree/Behavior";
import { moveToTarget, setMoveTargetFromBlackboard } from "./moveTo";

import { creepCapacityFull } from "./energyFull";
import { findNearbySource } from "./findNearbySource";
import { harvestEnergy } from "./harvestEnergy";

export const getEnergyFromSource = () => Selector(
    creepCapacityFull(),
    Sequence(
        findNearbySource(),
        setMoveTargetFromBlackboard(),
        moveToTarget(),
        harvestEnergy(),
    ),
)
