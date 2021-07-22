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
            // If creep succeeds or fails, remove from task
            if (result === BehaviorResult.SUCCESS) {
                finalResult = BehaviorResult.INPROGRESS;
                if (target instanceof Creep) {
                    target.memory.targetPos = undefined;
                    target.memory.targetRange = undefined;
                }
                this.assigned = this.assigned.filter(a => a !== target?.id);
            } else if (result === BehaviorResult.FAILURE) {
                if (target instanceof Creep) {
                    target.memory.targetPos = undefined;
                    target.memory.targetRange = undefined;
                }
                this.assigned = this.assigned.filter(a => a !== target?.id);
            } else {
                finalResult = result;
            }
        }
        if (finalResult === BehaviorResult.FAILURE) {
            this.result = finalResult;
        }
        if (this.meetsCapacity([])) {
            this.result = BehaviorResult.SUCCESS;
        }
        if (this.result === BehaviorResult.FAILURE || this.result === BehaviorResult.SUCCESS) {
            this.assigned.forEach(id => {
                let target = byId(id);
                if (target instanceof Creep) {
                    target.memory.targetPos = undefined;
                    target.memory.targetRange = undefined;
                }
            })
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
