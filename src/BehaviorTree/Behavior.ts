export enum BehaviorResult {
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    INPROGRESS = 'INPROGRESS'
}

export interface Blackboard {};

export type Behavior<T> = (target: T, blackboard: Blackboard) => BehaviorResult
export type BehaviorBuilder<T> = (...args: any[]) => Behavior<T>

export function Sequence<T>(...args: Behavior<T>[]): Behavior<T> {
    return (target, blackboard) => {
        for (let behavior of args) {
            let result = behavior(target, blackboard)
            if (result === BehaviorResult.SUCCESS) {
                continue;
            }
            return result;
        }
        return BehaviorResult.SUCCESS;
    }
}
export function Selector<T>(...args: Behavior<T>[]): Behavior<T> {
    return (target, blackboard) => {
        for (let behavior of args) {
            let result = behavior(target, blackboard)
            if (result === BehaviorResult.FAILURE) {
                continue;
            }
            return result;
        }
        return BehaviorResult.FAILURE;
    }
}
