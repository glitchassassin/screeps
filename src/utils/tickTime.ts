import { DeltaMetric } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { log } from "./logger";

let tickTime = new DeltaMetric(5000, 100);

export const calcTickTime = () => { // Call this from 1st line of main loop. Can adjust samples used for calculation from there.
    tickTime.update(Date.now());
    log('tickTime', `ms: ${-tickTime.mean()}`)
}
