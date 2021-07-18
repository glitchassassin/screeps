import { Selector, Sequence } from "BehaviorTree/Behavior";
import { moveToTarget, setMoveTargetFromBlackboard } from "./moveTo";

import { energyFull } from "./energyFull";
import { findEnergySource } from "./findEnergySource";
import { withdrawResources } from "./withdrawResources";

export const getEnergyNearby = (radius = 5) => Selector(
    energyFull(),
    Sequence(
        findEnergySource(radius),
        setMoveTargetFromBlackboard(),
        moveToTarget(),
    ),
    withdrawResources(RESOURCE_ENERGY),
)
