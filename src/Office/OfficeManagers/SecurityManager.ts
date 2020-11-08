import { OfficeTaskManager } from "./OfficeTaskManager";
import { Table } from "Visualizations/Table";
import { lazyMap } from "utils/lazyIterators";
import profiler from "screeps-profiler";

export class SecurityManager extends OfficeTaskManager {
    run() {
        super.run();
        if (global.v.security.state) {
            this.report();
        }
    }
    report() {
        super.report();
        let statusTable = [
            ['Territory', 'Last Surveyed'],
            ...lazyMap(global.worldState.rooms.byOffice.get(this.office.name) ?? [], room => [room.name, room.scanned])
        ]
        Table(new RoomPosition(2, 2, this.office.center.name), statusTable);
    }
}

profiler.registerClass(SecurityManager, 'SecurityManager');
