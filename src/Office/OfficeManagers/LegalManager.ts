import { Dashboard, Label, Rectangle, Table } from "screeps-viz";

import { Controllers } from "WorldState/Controllers";
import { LegalData } from "WorldState/LegalData";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { RoomPlanData } from "WorldState/RoomPlans";
import profiler from "screeps-profiler";

export class LegalManager extends OfficeTaskManager {
    minionTypes = ['PARALEGAL', 'LAWYER'];

    dashboard = [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 3,
            widget: Rectangle({ data: Label({
                data: 'Legal Manager Report',
                config: { style: { font: 1.4 } }
            }) })
        },
        {
            pos: { x: 32, y: 18 },
            width: 5,
            height: 10,
            widget: Rectangle({ data: this.idleMinionsTable })
        },
        {
            pos: { x: 1, y: 5 },
            width: 30,
            height: 30,
            widget: Rectangle({ data: this.requestsTable })
        },
        {
            pos: { x: 32, y: 5 },
            width: 16,
            height: 12,
            widget: Rectangle({ data: Table(() => {
                return {
                    data: Controllers.byOffice(this.office).map(controller => [
                        controller.pos.roomName,
                        controller.owner ?? controller.reservation?.username ?? '',
                        controller.reservation?.ticksToEnd ?? ''
                    ]),
                    config: {
                        headers: ['Controller', 'Owner', 'Reserved']
                    }
                }
            }) })
        },
    ]

    plan() {
        let controller = LegalData.byRoom(this.office.name)
        if (!controller && Game.rooms[this.office.name].controller) {
            controller = {
                id: Game.rooms[this.office.name].controller!.id,
                pos: Game.rooms[this.office.name].controller!.pos
            }
        };
        if (!controller) return;
        // Initialize properties
        const office = RoomPlanData.byRoom(this.office.name)?.office
        if (office) {
            let {container, link} = office.headquarters
            controller.containerPos = container.pos;
            controller.containerId = container.structure?.id as Id<StructureContainer>
            controller.linkPos = link.pos;
            controller.linkId = link.structure?.id as Id<StructureLink>
        }
        LegalData.set(controller.id, controller, this.office.name);
    }

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
        if (global.v.legal.state) {
            Dashboard({
                widgets: this.dashboard,
                config: {
                    room: this.office.name
                }
            });
        }
    }
}

profiler.registerClass(LegalManager, 'LegalManager')
