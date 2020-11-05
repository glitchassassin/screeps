import { DefenseAnalyst } from "Boardroom/BoardroomManagers/DefenseAnalyst";
import { OfficeManagerStatus } from "Office/OfficeManager";
import { OfficeTaskManager } from "../OfficeTaskManager/OfficeTaskManager";
import { Table } from "Visualizations/Table";
import { lazyMap } from "utils/lazyIterators";
import profiler from "screeps-profiler";

export class SecurityManager extends OfficeTaskManager {
    run() {
        super.run();
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        let defenseAnalyst = global.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let [target] = defenseAnalyst.getPrioritizedAttackTargets(this.office);
        let [healTarget] = defenseAnalyst.getPrioritizedHealTargets(this.office);

        if (target || healTarget)
        for (let t of defenseAnalyst.getTowers(this.office)) {
            // Simple priorities
            if (target.gameObj) {
                t.gameObj?.attack(target.gameObj)
            } else if (healTarget) {
                t.gameObj?.heal(healTarget.gameObj)
            }
        }

        if (global.v.security.state) {
            this.report();
        }
    }
    report() {
        super.report();
        let statusTable = [
            ['Territory', 'Last Surveyed'],
            ...lazyMap(global.worldState.rooms.byOffice.get(this.office.name) ?? [], room => [room.name, room.scanned])
        ]
        Table(new RoomPosition(2, 2, this.office.center.name), statusTable);
    }
}

profiler.registerClass(SecurityManager, 'SecurityManager');
