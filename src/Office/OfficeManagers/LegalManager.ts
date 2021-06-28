import { Dashboard, Label, Rectangle, Table } from "screeps-viz";

import { Controllers } from "WorldState/Controllers";
import { LegalData } from "WorldState/LegalData";
import { OfficeTaskManager } from "./OfficeTaskManager";

export class LegalManager extends OfficeTaskManager {
    minionTypes = ['PARALEGAL', 'LAWYER'];

    dashboard = Dashboard({ room: this.office.name, widgets: [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 3,
            widget: Rectangle(Label(() => 'Legal Manager Report', { style: { font: 1.4 } }))
        },
        {
            pos: { x: 32, y: 18 },
            width: 5,
            height: 10,
            widget: Rectangle(this.idleMinionsTable)
        },
        {
            pos: { x: 1, y: 5 },
            width: 30,
            height: 30,
            widget: Rectangle(this.requestsTable)
        },
        {
            pos: { x: 32, y: 5 },
            width: 16,
            height: 12,
            widget: Rectangle(Table(() => {
                return Controllers.byOffice(this.office).map(controller => [
                    controller.pos.roomName,
                    controller.owner ?? controller.reservation?.username ?? '',
                    controller.reservation?.ticksToEnd ?? ''
                ])
            }, {
                headers: ['Controller', 'Owner', 'Reserved']
            }))
        },
    ]})

    run() {
        super.run()
        let controller = Controllers.byRoom(this.office.name);
        if (controller) {
            let legalData = LegalData.byRoom(this.office.name) ?? {id: controller.id, pos: controller.pos};
            if (!legalData.rclMilestones || !legalData.rclMilestones[controller.level]) {
                legalData.rclMilestones ??= {};
                legalData.rclMilestones[controller.level] ??= Game.time;
                LegalData.set(legalData.id, legalData, this.office.name);
            }
        }
        if (global.v.legal.state) { this.dashboard(); }
    }
}
