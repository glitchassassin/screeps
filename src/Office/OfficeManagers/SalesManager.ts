import { Bar, Meters } from "Visualizations/Meters";
import { byId, calculateFranchiseSurplus } from "utils/gameObjectSelectors";

import { CachedSource } from "WorldState/Sources";
import { FranchiseData } from "WorldState/FranchiseData";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { Table } from "Visualizations/Table";
import { lazyMap } from "utils/lazyIterators";
import profiler from "screeps-profiler";

export class SalesManager extends OfficeTaskManager {
    minionTypes = ['SALESMAN'];
    run() {
        super.run();
        if (global.v.sales.state) {
            this.report();
        }
    }
    isSourceTapped(source: CachedSource) {
        let count = 0;
        let workParts = 0;

        let maxSalesmen = FranchiseData.byId(source.id)?.maxSalesmen

        for (let request of this.requests) {
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
    report() {
        super.report();

        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;

        let headers = ['Franchise', 'Salesmen', 'Effective', 'Surplus']
        let rows = lazyMap(salesAnalyst.getUsableSourceLocations(this.office), source => {
            let franchise = FranchiseData.byId(source.id);
            let salesmen = this.requests.find(r => r.pos.isEqualTo(source.pos))?.assigned ?? []
            franchise?.containerPos && new RoomVisual(franchise.containerPos?.roomName).circle(franchise.containerPos, {radius: 0.55, stroke: 'red', fill: 'transparent'});
            return [
                `${source.pos.roomName}[${source.pos.x}, ${source.pos.y}]`,
                `${salesmen.length}/${franchise?.maxSalesmen}`,
                `${(salesmen.reduce((sum, salesman) =>
                    sum + (byId(salesman)?.getActiveBodyparts(WORK) ?? 0)
                , 0) / 5 * 100).toFixed(0)}%`,
                calculateFranchiseSurplus(source)
            ]
        })

        Table(new RoomPosition(2, 15, this.office.center.name), [headers, ...rows]);

        let chart = new Meters(
            Array.from(lazyMap(salesAnalyst.getUsableSourceLocations(this.office), source => new Bar(
                `${source.pos.roomName}[${source.pos.x}, ${source.pos.y}]`,
                {
                    fill: 'yellow',
                    stroke: 'yellow',
                    lineStyle: FranchiseData.byId(source.id)?.containerId ? 'solid' : 'dashed'
                },
                calculateFranchiseSurplus(source),
                2000
            )))
        )
        chart.render(new RoomPosition(2, 2, this.office.center.name), false)
    }
}
profiler.registerClass(SalesManager, 'SalesManager');
