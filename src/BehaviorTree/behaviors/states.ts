import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

export enum States {
    GET_ENERGY = 'GET_ENERGY',
    WORKING = 'WORKING',
}

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        state?: States
    }
}

export const stateIs = (state: States) => {
    return (target: any, bb: Blackboard) => {
        if (bb.state === state) return BehaviorResult.SUCCESS;
        return BehaviorResult.FAILURE;
    }
}

export const stateIsEmpty = () => {
    return (target: any, bb: Blackboard) => {
        if (bb.state === undefined) return BehaviorResult.SUCCESS;
        return BehaviorResult.FAILURE;
    }
}

export const setState = (state: States) => {
    return (target: any, bb: Blackboard) => {
        bb.state = state;
        return BehaviorResult.INPROGRESS;
    }
}
