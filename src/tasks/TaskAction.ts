import { SpeculativeMinion } from "./SpeculativeMinion";
import { TaskPrerequisite } from "./TaskPrerequisite";

export class TaskAction {
    message = "☑";
    getPrereqs(): TaskPrerequisite[] { return []; }
    action(creep: Creep) { return true; }
    cost(minion: SpeculativeMinion) { return 0; }
    predict(minion: SpeculativeMinion) { return minion; }
    valid() { return false; }
}
