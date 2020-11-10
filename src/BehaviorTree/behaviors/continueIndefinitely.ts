import { BehaviorResult } from "BehaviorTree/Behavior";

export const continueIndefinitely = () => () => {
    return BehaviorResult.INPROGRESS;
}
