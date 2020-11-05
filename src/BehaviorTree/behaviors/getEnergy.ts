import { moveToTarget, setMoveTargetFromBlackboard } from "./moveTo";

import { Sequence } from "BehaviorTree/Behavior";
import { findEnergySource } from "./findEnergySource";
import { withdrawEnergy } from "./withdrawEnergy";

export const getEnergy = () => Sequence(
    findEnergySource(),
    setMoveTargetFromBlackboard(),
    moveToTarget(),
    withdrawEnergy()
)
