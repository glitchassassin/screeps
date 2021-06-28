import { Dashboard, Label, Rectangle, Table } from "screeps-viz";

import { ExploreRequest } from "BehaviorTree/requests/Explore";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { RoomData } from "WorldState/Rooms";
import { byId } from "utils/gameObjectSelectors";

export class SecurityManager extends OfficeTaskManager {
    dashboard = Dashboard({ room: this.office.name, widgets: [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 3,
            widget: Rectangle(Label(() => 'Security Manager Report', { style: { font: 1.4 } }))
        },
        {
            pos: { x: 1, y: 5 },
            width: 30,
            height: 30,
            widget: Rectangle(this.requestsTable)
        },
        {
            pos: { x: 32, y: 5 },
            width: 16,
            height: 15,
            widget: Rectangle(Table(() => {
                return RoomData.byOffice(this.office).map(room => [room.name, room.scanned - Game.time])
            }, {
                headers: ['Territory', 'Last Surveyed']
            }))
        },
        {
            pos: { x: 32, y: 21 },
            width: 5,
            height: 10,
            widget: Rectangle(this.idleMinionsTable)
        },
    ]})
    run() {
        super.run();
        if (global.v.security.state) {
            this.dashboard();
            this.map();
        }
    }
    map() {
        RoomData.all().forEach(room => {
            Game.map.visual.text('👁', new RoomPosition(25,5,room.name), {color: Game.rooms[room.name] ? '#00FF00': '#FFFF00', fontFamily: 'Courier New', fontSize: 10});
        })

        this.requests.forEach(r => {
            if (r instanceof ExploreRequest) {
                r.assigned.forEach(c => {
                    if (byId(c)) Game.map.visual.line(byId(c)!.pos, new RoomPosition(25,25,r.roomName), {color: '#FF0000'});
                })
                Game.map.visual.text('👁', new RoomPosition(25,25,r.roomName), {color: '#FF0000', fontFamily: 'Courier New', fontSize: 20});
            }
        })
    }
}

// profiler.registerClass(SecurityManager, 'SecurityManager');
