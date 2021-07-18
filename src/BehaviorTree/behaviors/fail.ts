import { BehaviorResult } from "BehaviorTree/Behavior";

/**
 * Always returns FAILURE to cancel branch
 */
export const fail = () => () => {
    return BehaviorResult.FAILURE;
}
