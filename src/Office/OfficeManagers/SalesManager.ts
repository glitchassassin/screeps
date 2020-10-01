import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { Task } from "TaskRequests/Task";
import { HarvestTask } from "TaskRequests/types/HarvestTask";
import { TravelTask } from "TaskRequests/types/TravelTask";
import { TaskManager } from "./TaskManager";
import { Franchise, SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { ExploreTask } from "TaskRequests/types/ExploreTask";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";
import { countEnergyInContainersOrGround } from "utils/gameObjectSelectors";
import { table } from "table";
import { RoomVisualTable } from "utils/RoomVisualTable";
import { SwitchState } from "utils/VisualizationController";

export class SalesManager extends OfficeManager {
    franchises: Franchise[] = [];

    plan() {
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        this.franchises = salesAnalyst.getFranchiseLocations(this.office);

        let priority = 5;
        switch(this.status) {
            case OfficeManagerStatus.NORMAL:
                priority = 7;
            case OfficeManagerStatus.PRIORITY:
                priority = 10;
        }
        // Bump priority up if we have NO salesmen
        if (this.office.employees.filter(c => c.memory.type === 'SALESMAN').length < 2) priority += 2;
        // Scout surrounding Territories, if needed
        let unexplored = this.office.territories.filter(t => !t.scanned);
        if (unexplored.length > 0) {
            unexplored.forEach(territory => {
                this.office.submit(new TaskRequest(territory.name, new ExploreTask(territory.name), 5))
            })
        }
        // Maintains one Salesman per source,
        // respawning with a little lead time
        // to minimize downtime
        this.franchises.forEach(franchise => {
            // console.log(
            //     franchise.pos,
            //     'current salesmen:',
            //     franchise.salesmen.length,
            //     'out of',
            //     franchise.maxSalesmen,
            //     'working:',
            //     franchise.salesmen.reduce((a, b) => (a + b.getActiveBodyparts(WORK)), 0),
            //     'out of 5'
            // );
            if (
                (franchise.salesmen.length === 0) || // No salesmen, OR salesmen have fewer than 5 WORK parts
                (
                    franchise.salesmen.length < franchise.maxSalesmen &&
                    franchise.salesmen.reduce((a, b) => (a + b.getActiveBodyparts(WORK)), 0) < 5
                )
            ) {
                // No salesmen at the franchise: spawn one
                this.office.submit(new MinionRequest(franchise.id, priority, MinionTypes.SALESMAN, {
                    source: franchise.id,
                    ignoresRequests: true
                }))
            }
        })
    }
    run() {
        let taskManager = this.office.managers.get('TaskManager') as TaskManager;
        if (!taskManager) return;

        this.franchises.forEach(franchise => {

            franchise.salesmen.forEach(salesman => {
                if (taskManager.isIdle(salesman)) {
                    // Are there creeps at the primary franchise location already?
                    let salesmenCount = Game.rooms[franchise.pos.roomName] && franchise.pos.lookFor(LOOK_CREEPS).length
                    // If miner is not at mine site, go there
                    if (!salesman.pos.isEqualTo(franchise.pos) && salesmenCount === 0) {
                        taskManager.assign(new Task([new TravelTask(franchise.pos, 0)], salesman, franchise.id));
                    } else if (!salesman.pos.inRangeTo(franchise.sourcePos, 1)) {
                        taskManager.assign(new Task([new TravelTask(franchise.sourcePos, 1)], salesman, franchise.id));
                    } else {
                        if (salesman.memory.spawned && !salesman.memory.arrived) {
                            salesman.memory.arrived = Game.time - salesman.memory.spawned;
                        }
                        // Keep mining ad infinitum.
                        taskManager.assign(new Task([new HarvestTask(franchise.source?.pos)], salesman, franchise.id));
                    }
                }
            })
        })
        if (global.v.sales.state === SwitchState.ON) {
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
                countEnergyInContainersOrGround(franchise.sourcePos)
            ]
        })

        RoomVisualTable(new RoomPosition(2, 2, this.office.center.name), [headers, ...rows]);
    }
}
