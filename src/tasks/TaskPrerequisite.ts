import { SpeculativeMinion } from "./SpeculativeMinion";
import { TaskAction } from './TaskAction';


export class TaskPrerequisite {
    met(minion: SpeculativeMinion) {
        return false;
    }
    toMeet(minion: SpeculativeMinion): TaskAction[] | null {
        return null;
    }
}
