
export enum TaskActionResult {
    SUCCESS = 'SUCCESS',
    INPROGRESS = 'INPROGRESS',
    FAILED = 'FAILED'
}

export class TaskAction {
    public capacity = 1;
    public assigned = 0;
    constructor(public priority: number) {}
    message = "☑";
    action(creep: Creep) { return TaskActionResult.SUCCESS; }
    valid() { return true; }
    canBeFulfilledBy(creep: Creep) { return false; }
}
