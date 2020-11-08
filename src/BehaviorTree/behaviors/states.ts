import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { CachedCreep } from "WorldState";
import { log } from "utils/logger";

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
        if (target instanceof CachedCreep) {
            log(target.name, `stateIs ${state} ? ${bb.state === state}`)
        }
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
        if (target instanceof CachedCreep) {
            log(target.name, `setState: ${state}`)
        }
        bb.state = state;
        return BehaviorResult.INPROGRESS;
    }
}
