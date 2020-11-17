import { ExploreRequest } from "BehaviorTree/requests/Explore";
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


        global.worldState.rooms.byRoom.forEach(room => {
            Game.map.visual.text('👁', new RoomPosition(25,5,room.name), {color: room.gameObj ? '#00FF00': '#FFFF00', fontFamily: 'Courier New', fontSize: 10});
        })

        this.requests.forEach(r => {
            if (r instanceof ExploreRequest) {
                r.assigned.forEach(c => {
                    Game.map.visual.line(c.pos, new RoomPosition(25,25,r.roomName), {color: '#FF0000'});
                })
                Game.map.visual.text('👁', new RoomPosition(25,25,r.roomName), {color: '#FF0000', fontFamily: 'Courier New', fontSize: 20});
            }
        })
    }
}

profiler.registerClass(SecurityManager, 'SecurityManager');
