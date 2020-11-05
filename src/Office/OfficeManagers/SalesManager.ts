import { Bar, Meters } from "Visualizations/Meters";

import { OfficeTaskManager } from "./OfficeTaskManager/OfficeTaskManager";
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
    report() {
        super.report();
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;

        let headers = ['Franchise', 'Salesmen', 'Effective', 'Surplus']
        let rows = lazyMap(salesAnalyst.getUsableSourceLocations(this.office), source => {
            return [
                `${source.pos.roomName}[${source.pos.x}, ${source.pos.y}]`,
                `${source.salesmen.length}/${source.maxSalesmen}`,
                `${(source.salesmen.reduce((sum, salesman) =>
                    sum + salesman.gameObj.getActiveBodyparts(WORK)
                , 0) / 5 * 100).toFixed(0)}%`,
                source.surplus ?? 0
            ]
        })

        Table(new RoomPosition(2, 15, this.office.center.name), [headers, ...rows]);

        let chart = new Meters(
            Array.from(lazyMap(salesAnalyst.getUsableSourceLocations(this.office), source => new Bar(
                `${source.pos.roomName}[${source.pos.x}, ${source.pos.y}]`,
                {
                    fill: 'yellow',
                    stroke: 'yellow',
                    lineStyle: source.container ? 'solid' : 'dashed'
                },
                source.surplus ?? 0,
                2000
            )))
        )
        chart.render(new RoomPosition(2, 2, this.office.center.name), false)
    }
}
profiler.registerClass(SalesManager, 'SalesManager');
