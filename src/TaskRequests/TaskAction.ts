import { SpeculativeMinion } from "./SpeculativeMinion";
import { TaskPrerequisite } from "./TaskPrerequisite";

export enum TaskActionResult {
    SUCCESS = 'SUCCESS',
    INPROGRESS = 'INPROGRESS',
    FAILED = 'FAILED'
}

export class TaskAction {
    message = "☑";
    getPrereqs(): TaskPrerequisite[] { return []; }
    action(creep: Creep) { return TaskActionResult.SUCCESS; }
    cost(minion: SpeculativeMinion) { return 0; }
    predict(minion: SpeculativeMinion) { return minion; }
    valid() { return true; }
    cancel(creep: Creep) { }
}
