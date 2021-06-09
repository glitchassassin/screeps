import { Selector, Sequence } from "BehaviorTree/Behavior";
import { moveToTarget, setMoveTargetFromBlackboard } from "./moveTo";

import { energyFull } from "./energyFull";
import { findEnergySource } from "./findEnergySource";
import { withdrawEnergy } from "./withdrawEnergy";

export const getEnergy = () => Selector(
    energyFull(),
    withdrawEnergy(),
    Sequence(
        findEnergySource(),
        setMoveTargetFromBlackboard(),
        moveToTarget(),
    )
)
