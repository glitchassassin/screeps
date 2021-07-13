import { Selector, Sequence } from "BehaviorTree/Behavior";
import { moveToTarget, setMoveTargetFromBlackboard } from "./moveTo";

import { energyFull } from "./energyFull";
import { findNearbySource } from "./findNearbySource";
import { harvestEnergy } from "./harvestEnergy";

export const getEnergyFromSource = () => Selector(
    energyFull(),
    Sequence(
        findNearbySource(),
        setMoveTargetFromBlackboard(),
        moveToTarget(),
    ),
    harvestEnergy(),
)
