export enum BehaviorResult {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    INPROGRESS = 'INPROGRESS'
}

export interface Blackboard {}

export type Behavior = (target: Creep) => BehaviorResult
export type BehaviorBuilder = (...args: any[]) => Behavior

export function Sequence(...args: Behavior[]): Behavior {
    return (target) => {
        for (let behavior of args) {
            let result = behavior(target)
            if (result === BehaviorResult.SUCCESS) {
                continue;
            }
            return result;
        }
        return BehaviorResult.SUCCESS;
    }
}
export function Selector(...args: Behavior[]): Behavior {
    return (target) => {
        for (let behavior of args) {
            let result = behavior(target)
            if (result === BehaviorResult.FAILURE) {
                continue;
            }
            return result;
        }
        return BehaviorResult.FAILURE;
    }
}
