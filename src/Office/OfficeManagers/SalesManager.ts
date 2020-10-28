import { Bar, Meters } from "Visualizations/Meters";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";

import { HRManager } from "./HRManager";
import { HarvestTask } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/types/HarvestTask";
import { Office } from "Office/Office";
import { OfficeManagerStatus } from "Office/OfficeManager";
import { OfficeTaskManager } from "./OfficeTaskManager/OfficeTaskManager";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { Table } from "Visualizations/Table";
import { lazyMap } from "utils/lazyIterators";
import profiler from "screeps-profiler";

export class SalesManager extends OfficeTaskManager {
    constructor(
        office: Office,
        private salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst,
        private hrManager = office.managers.get('HRManager') as HRManager
    ) {
        super(office);
    }
    plan() {
        super.plan();
        if (this.status === OfficeManagerStatus.OFFLINE) return;

        let priority = 5;
        switch(this.status) {
            case OfficeManagerStatus.NORMAL:
                priority = 7;
                break;
            case OfficeManagerStatus.PRIORITY:
                priority = 10;
                break;
        }
        // Bump priority up if we have NO salesmen
        if (this.office.employees.filter(c => c.memory.type === 'SALESMAN').length === 0) {
            priority += 2;
        }
        // Bump priority down if we currently have a franchise surplus
        let surplus = 0;
        let maxCapacity = 0;
        for (let source of this.salesAnalyst.getUsableSourceLocations(this.office)) {
            surplus += source.surplus ?? 0
            maxCapacity += CONTAINER_CAPACITY;
        }
        if (surplus > maxCapacity) {
            priority -= 2;
        }
        // Maintains one Salesman per source,
        // respawning with a little lead time
        // to minimize downtime
        for (let source of this.salesAnalyst.getUsableSourceLocations(this.office)) {
            let salesmenCount = 0;
            let salesmenWork = 0;
            for (let salesman of source.salesmen) {
                if (this.isIdle(salesman)) {
                    // Keep mining ad infinitum.
                    this.submit(salesman.name, new HarvestTask(source, 10))
                }
                salesmenCount += 1;
                salesmenWork += salesman.gameObj.getActiveBodyparts(WORK);
            }
            if (salesmenCount < source.maxSalesmen && salesmenWork < 5) {
                // No salesmen at the franchise: spawn one
                // Scale priority by distance
                let distance = Game.map.getRoomLinearDistance(this.office.center.name, source.pos.roomName);
                this.hrManager.submit(new MinionRequest(source.id, priority - distance, MinionTypes.SALESMAN, {
                    source: source.id,
                    manager: this.constructor.name
                }))
            }
        }
    }
    run() {
        super.run();
        if (global.v.sales.state) {
            this.report();
        }
    }
    report() {
        let headers = ['Franchise', 'Salesmen', 'Effective', 'Surplus']
        let rows = lazyMap(this.salesAnalyst.getUsableSourceLocations(this.office), source => {
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
            Array.from(lazyMap(this.salesAnalyst.getUsableSourceLocations(this.office), source => new Bar(
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
