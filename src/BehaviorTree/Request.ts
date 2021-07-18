import { Behavior, BehaviorResult, Blackboard } from "./Behavior";

import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

export abstract class Request<T extends Creep|StructureSpawn> {
    constructor(public priority = 5) {}
    public result?: BehaviorResult;
    public blackboards = new Map<Id<T>, Blackboard>();
    public sharedBlackboard: Blackboard = {};

    public assigned: Id<T>[] = [];
    public onAssigned = () => {};

    public assign(target: T) {
        if (!this.canBeFulfilledBy(target) || this.assigned.includes(target.id as Id<T>)) {
            return false;
        }

        this.assigned.push(target.id as Id<T>);
        this.blackboards.set(target.id as Id<T>, {});

        if (this.assigned.length === 1) {
            this.onAssigned();
        }

        return true;
    }

    public run(): BehaviorResult {
        let finalResult = BehaviorResult.FAILURE;

        // Remove missing objects
        this.assigned = this.assigned.filter(t => Game.getObjectById(t));

        for (let target of this.assigned.map(byId)) {
            if (!target) continue;
            let blackboard = this.blackboards.get(target.id as Id<T>);
            if (!blackboard) throw new Error('Blackboard not created for target')
            // log(target.name, 'Blackboard: ' + JSON.stringify(blackboard));
            let result = this.action(target, blackboard, this.sharedBlackboard);
            // If one is finished, the request is finished
            if (result === BehaviorResult.SUCCESS) {
                this.result = result;
                log(this.constructor.name, `Result: ${result}`);
                return result;
            }
            // If one is still running, the task is still running
            if (result === BehaviorResult.INPROGRESS) finalResult = result;
            // If all fail, the task fails
        }
        if (finalResult === BehaviorResult.FAILURE) {
            this.result = finalResult;
        }
        log(this.constructor.name, `Result: ${finalResult}`);
        return finalResult;
    }
    public capacityMet() {
        // Remove missing objects
        this.assigned = this.assigned.filter(t => Game.getObjectById(t));

        return this.meetsCapacity(this.assigned.map(byId) as T[]);
    }

    /**
     * @param targets List of assigned targets
     */
    abstract meetsCapacity(targets: T[]): boolean;
    abstract canBeFulfilledBy(target: T): boolean;
    abstract action: Behavior<T>;
    public pos?: RoomPosition;
}
