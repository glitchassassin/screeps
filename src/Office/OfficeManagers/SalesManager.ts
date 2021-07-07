import { Bar, Dashboard, Grid, Label, Rectangle, Table } from "screeps-viz";
import { byId, calculateFranchiseSurplus, sortByDistanceTo } from "utils/gameObjectSelectors";

import { CachedSource } from "WorldState/Sources";
import { FranchiseData } from "WorldState/FranchiseData";
import { Office } from "Office/Office";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";

export class SalesManager extends OfficeTaskManager {
    minionTypes = ['SALESMAN'];

    dashboard = [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 2,
            widget: Rectangle({ data: Label({ data: 'Sales Manager Report' }) })
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
                let salesAnalyst = this.office.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;

                return {
                    data: salesAnalyst.getExploitableFranchises(this.office).map(franchise => {
                        let salesmen = this.requests.find(r => r.pos.isEqualTo(franchise.pos))?.assigned ?? []
                        franchise?.containerPos && new RoomVisual(franchise.containerPos?.roomName).circle(franchise.containerPos, {radius: 0.55, stroke: 'red', fill: 'transparent'});
                        return [
                            `${franchise.pos.roomName}[${franchise.pos.x}, ${franchise.pos.y}]`,
                            `${salesmen.length}/${franchise?.maxSalesmen}`,
                            `${(salesmen.reduce((sum, salesman) =>
                                sum + (byId(salesman)?.getActiveBodyparts(WORK) ?? 0)
                            , 0) / 5 * 100).toFixed(0)}%`,
                            franchise.distance ?? '--'
                        ]
                    }),
                    config: {
                        headers: ['Franchise', 'Salesmen', 'Effective', 'Distance']
                    }
                }
            }) })
        },
        {
            pos: { x: 1, y: 4 },
            width: 39,
            height: 20,
            widget: Rectangle({ data: Grid(() => {
                let salesAnalyst = this.office.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
                return {
                    data: salesAnalyst.getExploitableFranchises(this.office).map(franchise => Bar(() => ({
                        data: {
                            value: calculateFranchiseSurplus(franchise),
                            maxValue: CONTAINER_CAPACITY
                        },
                        config: {
                            label: `${franchise.pos.roomName}[${franchise.pos.x}, ${franchise.pos.y}]`,
                            style: {
                                fill: 'yellow',
                                stroke: 'yellow',
                                lineStyle: franchise.containerId ? 'solid' : 'dashed'
                            }
                        }
                    }))),
                    config: {
                        columns: 7,
                        rows: 2
                    }
                }
            }) })
        },
    ];

    constructor(office: Office) {
        super(office);
    }
    run() {
        super.run();
        if (global.v.sales.state) {
            Dashboard({
                widgets: this.dashboard,
                config: { room: this.office.name }
            });
        }
    }
    isSourceTapped(source: CachedSource) {
        let count = 0;
        let workParts = 0;

        let maxSalesmen = FranchiseData.byId(source.id)?.maxSalesmen

        for (let request of this.requests.sort(sortByDistanceTo(this.office.controller.pos))) {
            if (request.pos.isEqualTo(source.pos)) {
                for (let salesman of request.assigned) {
                    count += 1;
                    workParts += byId(salesman)?.getActiveBodyparts(WORK) ?? 0;
                    if (workParts >= 5 || (maxSalesmen && count >= maxSalesmen)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
// profiler.registerClass(SalesManager, 'SalesManager');
