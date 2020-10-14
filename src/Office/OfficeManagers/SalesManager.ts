import { Franchise, SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { OfficeManagerStatus } from "Office/OfficeManager";
import { HarvestTask } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/types/HarvestTask";
import profiler from "screeps-profiler";
import { Bar, Meters } from "Visualizations/Meters";
import { Table } from "Visualizations/Table";
import { HRManager } from "./HRManager";
import { OfficeTaskManager } from "./OfficeTaskManager/OfficeTaskManager";

export class SalesManager extends OfficeTaskManager {
    franchises: Franchise[] = [];

    plan() {
        super.plan();
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        this.franchises = salesAnalyst.getFranchiseLocations(this.office);

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
        if (this.franchises.reduce((surplus, franchise) => surplus + (franchise.surplus ?? 0), 0) > this.franchises.length * CONTAINER_CAPACITY) {
            priority -= 2;
        }
        // Maintains one Salesman per source,
        // respawning with a little lead time
        // to minimize downtime
        this.franchises.forEach(franchise => {
            if (
                (franchise.salesmen.length === 0) || // No salesmen, OR salesmen have fewer than 5 WORK parts
                (
                    franchise.salesmen.length < franchise.maxSalesmen &&
                    franchise.salesmen.reduce((a, b) => (a + b.getActiveBodyparts(WORK)), 0) < 5
                )
            ) {
                // No salesmen at the franchise: spawn one
                // Scale priority by distance
                let distance = Game.map.getRoomLinearDistance(this.office.center.name, franchise.pos.roomName);
                let hrManager = this.office.managers.get('HRManager') as HRManager;
                hrManager.submit(new MinionRequest(franchise.id, priority - distance, MinionTypes.SALESMAN, {
                    source: franchise.id,
                    manager: this.constructor.name
                }))
            }
            franchise.salesmen.forEach(salesman => {
                if (this.isIdle(salesman)) {
                    // Keep mining ad infinitum.
                    this.submit(salesman.id, new HarvestTask(franchise, 10))
                }
            })
        })
    }
    run() {
        super.run();
        if (global.v.sales.state) {
            this.report();
        }
    }
    report() {
        let headers = ['Franchise', 'Salesmen', 'Effective', 'Surplus']
        let rows = this.franchises.map(franchise => {
            return [
                `${franchise.sourcePos.roomName}[${franchise.sourcePos.x}, ${franchise.sourcePos.y}]`,
                `${franchise.salesmen.length}/${franchise.maxSalesmen}`,
                `${(franchise.salesmen.reduce((sum, salesman) =>
                    sum + salesman.getActiveBodyparts(WORK)
                , 0) / 5 * 100).toFixed(0)}%`,
                franchise.surplus ?? 0
            ]
        })

        Table(new RoomPosition(2, 15, this.office.center.name), [headers, ...rows]);

        let chart = new Meters(
            this.franchises.map(franchise => new Bar(
                `${franchise.sourcePos.roomName}[${franchise.sourcePos.x}, ${franchise.sourcePos.y}]`,
                {
                    fill: 'yellow',
                    stroke: 'yellow',
                    lineStyle: franchise.container ? 'solid' : 'dashed'
                },
                franchise.surplus ?? 0,
                2000
            ))
        )
        chart.render(new RoomPosition(2, 2, this.office.center.name), false)
    }
}
profiler.registerClass(SalesManager, 'SalesManager');
