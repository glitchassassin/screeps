import { deserialize } from 'v8';
import {
    Task,
    BuildTask,
    HarvestTask,
    TransferTask,
    TravelTask,
    UpgradeTask,
    WithdrawTask,
} from '../internal';

export const taskTypes = [
    HarvestTask,
    TravelTask,
    TransferTask,
    WithdrawTask,
    UpgradeTask,
    BuildTask,
].reduce((a: {[id: string]: typeof Task}, b) => {
    a[b.name] = b;
    return a;
}, {})

export const deserializeTask = (task: string) => {
    let taskData = JSON.parse(task);
    let t = new taskTypes[taskData.taskType]();
    t.creep = Game.getObjectById(taskData.creepId as Id<Creep>);
    t.next = deserializeTask(taskData.task);
    return t;
}

export const serializeTask = (task: Task) => {

}
