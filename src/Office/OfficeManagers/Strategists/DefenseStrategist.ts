import { Capacity } from "WorldState/Capacity";
import { DefenseAnalyst } from "Boardroom/BoardroomManagers/DefenseAnalyst";
import { LogisticsManager } from "../LogisticsManager";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { TransferRequest } from "Logistics/LogisticsRequest";
import profiler from "screeps-profiler";

export class DefenseStrategist extends OfficeManager {
    public request?: MinionRequest;
    public fallbackRequest?: MinionRequest;
    buildRequest?: MinionRequest;

    plan() {
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let defenseAnalyst = global.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;

        let [target] = defenseAnalyst.getPrioritizedAttackTargets(this.office);

        for (let tower of defenseAnalyst.getTowers(this.office)) {
            // Auxiliary orders
            if ((Capacity.byId(tower.id)?.free ?? 0) > 0) {
                logisticsManager.submit(tower.pos.roomName, new TransferRequest(tower, 4))
            }

            // Primary orders
            if (target) {
                tower.attack(target);
            }
        }
    }
}
profiler.registerClass(DefenseStrategist, 'DefenseStrategist');
