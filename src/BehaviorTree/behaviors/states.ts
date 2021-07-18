import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { log } from "utils/logger";

export enum States {
    GET_ENERGY = 'GET_ENERGY',
    WORKING = 'WORKING',
    WITHDRAW = 'WITHDRAW',
    DEPOSIT = 'DEPOSIT',
}

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        state?: States
    }
}

/**
 * Returns SUCCESS if state matches, FAILURE otherwise
 */
export const stateIs = (state: States) => {
    return (target: any, bb: Blackboard) => {
        if (target instanceof Creep) {
            log(target.name, `stateIs ${state} ? ${bb.state === state}`)
        }
        if (bb.state === state) return BehaviorResult.SUCCESS;
        return BehaviorResult.FAILURE;
    }
}

/**
 * Returns SUCCESS if state is empty, FAILURE otherwise
 */
export const stateIsEmpty = () => {
    return (target: any, bb: Blackboard) => {
        if (bb.state === undefined) return BehaviorResult.SUCCESS;
        return BehaviorResult.FAILURE;
    }
}

/**
 * Returns INPROGRESS and sets state in blackboard
 */
export const setState = (state: States) => {
    return (target: any, bb: Blackboard) => {
        if (target instanceof Creep) {
            log(target.name, `setState: ${state}`)
        }
        bb.state = state;
        return BehaviorResult.INPROGRESS;
    }
}
