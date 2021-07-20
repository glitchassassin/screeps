import { Bar, Dashboard, Grid, Label, Rectangle, Table } from "screeps-viz";
import { CachedSource, Sources } from "WorldState/Sources";

import { FranchiseData } from "WorldState/FranchiseData";
import { FranchisePlan } from "Boardroom/BoardroomManagers/Architects/FranchisePlan";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { RoomData } from "WorldState/Rooms";
import { RoomPlanData } from "WorldState/RoomPlans";
import { SalesAnalyst } from "Analysts/SalesAnalyst";
import { byId } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

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
                return {
                    data: SalesAnalyst.getExploitableFranchises(this.office).map(franchise => {
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
                return {
                    data: SalesAnalyst.getExploitableFranchises(this.office).map(franchise => Bar(() => ({
                        data: {
                            value: LogisticsAnalyst.calculateFranchiseSurplus(franchise),
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

    plan() {
        for (let t of RoomData.byOffice(this.office)) {
            let plans = RoomPlanData.byRoom(t.name);
            let plan = t.territoryOf ? plans?.territory : plans?.office
            if (!plan) continue;
            for (let s of Sources.byRoom(t.name)) {
                let franchise = FranchiseData.byId(s.id) ?? {id: s.id, pos: s.pos}

                // Need to match franchise room plan to the source ID
                // Need to populate link as well

                let franchisePlan = (s.pos.isNearTo(plan.franchise1.container.pos) ? plan.franchise1 : plan.franchise2)

                franchise.containerPos = franchisePlan?.container.pos;
                franchise.containerId = franchisePlan?.container.structure?.id as Id<StructureContainer>;

                if (!t.territoryOf && (franchisePlan as FranchisePlan).link) {
                    franchise.linkPos = (franchisePlan as FranchisePlan).link.pos;
                    franchise.linkId = (franchisePlan as FranchisePlan).link.structure?.id as Id<StructureLink>;
                }
                // Initialize properties
                if (!franchise.maxSalesmen) {
                    franchise.maxSalesmen = 0;
                    for (let pos of MapAnalyst.calculateAdjacentPositions(s.pos)) {
                        if (MapAnalyst.isPositionWalkable(pos, true)) franchise.maxSalesmen += 1;
                    }
                }
                FranchiseData.set(s.id, franchise, s.pos.roomName);
            }
        }
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

        for (let request of this.requests.sort(MapAnalyst.sortByDistanceTo(this.office.controller.pos))) {
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
profiler.registerClass(SalesManager, 'SalesManager');
