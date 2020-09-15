import { Task } from "./Task";
import { HarvestTask } from "./types/HarvestTask";
import { TransferTask } from "./types/TransferTask";
import { TravelTask } from "./types/TravelTask";
import { UpgradeTask } from "./types/UpgradeTask";
import { WithdrawTask } from "./types/WithdrawTask";

export const taskTypes = [
    HarvestTask,
    TravelTask,
    TransferTask,
    WithdrawTask,
    UpgradeTask,
].reduce((a: {[id: string]: typeof Task}, b) => {
    a[b.name] = b;
    return a;
}, {})
