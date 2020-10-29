import { CachedCreep } from "WorldState/branches/WorldMyCreeps";

export enum TaskActionResult {
    SUCCESS = 'SUCCESS',
    INPROGRESS = 'INPROGRESS',
    FAILED = 'FAILED'
}

export class TaskAction {
    public capacity = 1;
    public assigned = 0;
    public done = false;
    constructor(public priority: number) {}
    message = "☑";
    action(creep: CachedCreep) { return TaskActionResult.SUCCESS; }
    valid() { return !this.done; }
    canBeFulfilledBy(creep: CachedCreep) { return false; }
}
