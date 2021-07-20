import { Dashboard, Label, Rectangle, Table } from "screeps-viz";

import { MapAnalyst } from "Analysts/MapAnalyst";
import { MineData } from "WorldState/MineData";
import { Minerals } from "WorldState/Minerals";
import { OfficeTaskManager } from "./OfficeTaskManager";
import profiler from "screeps-profiler";

export class MineManager extends OfficeTaskManager {
    minionTypes = ['FOREMAN'];

    dashboard = [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 2,
            widget: Rectangle({ data: Label({ data: 'Mine Manager Report' }) })
        },
        {
            pos: { x: 41, y: 4 },
            width: 7,
            height: 10,
            widget: Rectangle({ data: this.idleMinionsTable })
        },
        {
            pos: { x: 1, y: 25 },
            width: 26,
            height: 20,
            widget: Rectangle({ data: this.requestsTable })
        },
        {
            pos: { x: 28, y: 25 },
            width: 20,
            height: 20,
            widget: Rectangle({ data: Table(() => {
                return {
                    data: MineData.byOffice(this.office).map(mine => {
                        let foremen = this.requests.find(r => r.pos.isEqualTo(mine.pos))?.assigned ?? []
                        mine?.containerPos && new RoomVisual(mine.containerPos?.roomName).circle(mine.containerPos, {radius: 0.55, stroke: 'red', fill: 'transparent'});
                        return [
                            `${mine.pos.roomName}[${mine.pos.x}, ${mine.pos.y}]`,
                            `${foremen.length}/${mine?.maxForemen}`,
                            mine.distance ?? '--'
                        ]
                    }),
                    config: {
                        headers: ['Mine', 'Foremen', 'Distance']
                    }
                }
            }) })
        },
    ];

    plan() {
        let mineral = Minerals.byRoom(this.office.name)
        if (!mineral) return;
        let mine = MineData.byId(mineral.id) ?? {id: mineral.id, pos: mineral.pos}
        if (!mine.maxForemen) {
            mine.maxForemen = 0;
            for (let pos of MapAnalyst.calculateAdjacentPositions(mineral.pos)) {
                if (MapAnalyst.isPositionWalkable(pos, true)) mine.maxForemen += 1;
            }
        }
        MineData.set(mineral.id, mine, this.office.name);
    }

    run() {
        super.run();
        if (global.v.mines.state) {
            Dashboard({
                widgets: this.dashboard,
                config: { room: this.office.name }
            });
        }
    }
}

profiler.registerClass(MineManager, 'MineManager')
