import { Selector, Sequence } from "BehaviorTree/Behavior";
import { moveToTarget, setMoveTargetFromBlackboard } from "./moveTo";

import { energyFull } from "./energyFull";
import { findEnergySource } from "./findEnergySource";
import { withdrawResources } from "./withdrawResources";

export const getEnergy = () => Selector(
    energyFull(),
    Sequence(
        findEnergySource(),
        setMoveTargetFromBlackboard(),
        moveToTarget(),
    ),
    withdrawResources(RESOURCE_ENERGY),
)
