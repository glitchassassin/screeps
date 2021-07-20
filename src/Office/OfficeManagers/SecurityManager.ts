import { Dashboard, Label, Rectangle, Table } from "screeps-viz";

import { ExploreRequest } from "BehaviorTree/requests/Explore";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { PROFILE } from "config";
import { RoomData } from "WorldState/Rooms";
import { byId } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

export class SecurityManager extends OfficeTaskManager {
    dashboard = [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 3,
            widget: Rectangle({ data: Label({
                data: 'Security Manager Report',
                config: { style: { font: 1.4 } }
            }) })
        },
        {
            pos: { x: 1, y: 5 },
            width: 30,
            height: 30,
            widget: Rectangle({ data: this.requestsTable })
        },
        {
            pos: { x: 32, y: 5 },
            width: 16,
            height: 15,
            widget: Rectangle({ data: Table(() => ({
                data: RoomData.byOffice(this.office).map(room => [room.name, room.scanned - Game.time]),
                config: {
                    headers: ['Territory', 'Last Surveyed']
                }
            })) })
        },
        {
            pos: { x: 32, y: 21 },
            width: 5,
            height: 10,
            widget: Rectangle({ data: this.idleMinionsTable })
        },
    ]

    run() {
        super.run();
        if (global.v.security.state) {
            Dashboard({
                widgets: this.dashboard,
                config: { room: this.office.name }
            });
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

if (PROFILE.managers) profiler.registerClass(SecurityManager, 'SecurityManager');
