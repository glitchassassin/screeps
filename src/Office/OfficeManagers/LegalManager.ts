import { Controllers } from "WorldState/Controllers";
import { LegalData } from "WorldState/LegalData";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { Table } from "Visualizations/Table";
import { lazyMap } from "utils/lazyIterators";

export class LegalManager extends OfficeTaskManager {
    minionTypes = ['PARALEGAL', 'LAWYER'];
    run() {
        super.run()
        let controller = Controllers.byRoom(this.office.name);
        if (controller) {
            let legalData = LegalData.byRoom(this.office.name) ?? {id: controller.id};
            if (!legalData.rclMilestones || !legalData.rclMilestones[controller.level]) {
                legalData.rclMilestones ??= {};
                legalData.rclMilestones[controller.level] ??= `${Game.time}`;
                LegalData.set(legalData.id, legalData, this.office.name);
            }
        }
        if (global.v.legal.state) { this.report(); }
    }
    report() {
        super.report();
        let controllers = lazyMap(
            Controllers.byOffice(this.office) ?? [],
            controller => [
                controller.pos.roomName,
                controller.owner ?? controller.reservation?.username ?? '',
                controller.reservation?.ticksToEnd ?? ''
            ])
        let controllerTable = [
            ['Controller', 'Owner', 'Reserved'],
            ...controllers
        ]
        Table(new RoomPosition(2, 2, this.office.center.name), controllerTable);
    }
}
