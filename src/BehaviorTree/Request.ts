import { Behavior, BehaviorResult, Blackboard } from "./Behavior";
import { CachedCreep, CachedSpawn } from "WorldState";

export abstract class Request<T extends (CachedCreep|CachedSpawn)> {
    constructor(public priority = 5) {}
    public result?: BehaviorResult;
    public blackboards = new Map<T, Blackboard>();

    public assigned: T[] = [];
    public assign(target: T) {
        if (!this.canBeFulfilledBy(target) || this.assigned.includes(target)) {
            return false;
        }

        this.assigned.push(target);
        this.blackboards.set(target, {});
        return true;
    }

    public run(): BehaviorResult {
        let finalResult = BehaviorResult.FAILURE;

        // Remove missing objects
        this.assigned = this.assigned.filter(t => t.gameObj);

        for (let target of this.assigned) {
            let blackboard = this.blackboards.get(target);
            if (!blackboard) throw new Error('Blackboard not created for target')
            let result = this.action(target, blackboard);
            // If one is finished, the request is finished
            if (result === BehaviorResult.SUCCESS) {
                this.result = result;
                return result;
            }
            // If one is still running, the task is still running
            if (result === BehaviorResult.INPROGRESS) finalResult = result;
            // If all fail, the task fails
        }
        if (finalResult === BehaviorResult.FAILURE) {
            this.result = finalResult;
        }
        return finalResult;
    }
    public capacityMet() {
        // Remove missing objects
        this.assigned = this.assigned.filter(t => t.gameObj);

        return this.meetsCapacity(this.assigned);
    }

    /**
     * @param targets List of assigned targets
     */
    abstract meetsCapacity(targets: T[]): boolean;
    abstract canBeFulfilledBy(target: T): boolean;
    abstract action: Behavior<T>;
    public pos?: RoomPosition;
}
