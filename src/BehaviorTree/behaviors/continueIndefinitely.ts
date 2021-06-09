import { BehaviorResult } from "BehaviorTree/Behavior";

/**
 * Always returns INPROGRESS to prevent task from finishing.
 */
export const continueIndefinitely = () => () => {
    return BehaviorResult.INPROGRESS;
}
