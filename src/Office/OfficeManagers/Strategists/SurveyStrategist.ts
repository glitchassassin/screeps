import { Controllers } from "WorldState/Controllers";
import { ExploreRequest } from "BehaviorTree/requests/Explore";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { RoomData } from "WorldState/Rooms";
import { SecurityManager } from "../SecurityManager";
import { getRcl } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

export class SurveyStrategist extends OfficeManager {
    public request?: MinionRequest;
    public scanDispatched = new Map<string, number>();

    plan() {
        let defenseManager = this.office.managers.get('SecurityManager') as SecurityManager;

        if (this.request && !this.request.result) return;

        if (getRcl(this.office.name) !== 8) {
            // Handle scouting with minions
            let room = this.getRoomToScout();
            if(room) {
                this.scanDispatched.set(room, Game.time);
                this.request = new ExploreRequest(room)
                defenseManager.submit(this.request);
            }
        } else {
            // TODO: Handle scouting with observers
        }
    }

    getRoomToScout(): string|undefined {
        let surveyRadius = (getRcl(this.office.name) !== 8) ? 5 : 20

        let rooms = MapAnalyst.calculateNearbyRooms(this.office.name, surveyRadius, false);

        const ignoreHostileRoomFor = 1000

        const bestMatch = rooms.map(room => ({
                distance: MapAnalyst.getRangeTo(new RoomPosition(25, 25, this.office.name), new RoomPosition(25, 25, room)),
                name: room,
                lastScanned: this.scanDispatched.get(room) ?? RoomData.byRoom(room)?.scanned ?? 0,
                hostile: Boolean(Controllers.byRoom(room)?.owner && !Controllers.byRoom(room)?.my),
            }))
            .reduce((last, match) => {
                // Ignore hostile rooms even if we have nothing better to do
                if (match.hostile && Game.time - match.lastScanned < ignoreHostileRoomFor) {
                    return last;
                }
                if (last === undefined) {
                    return match;
                }
                if (
                    match.lastScanned < last.lastScanned ||
                    (match.distance < last.distance && match.lastScanned === last.lastScanned)
                ) {
                    return match;
                }
                return last;
            })
        return bestMatch?.name;
    }
}
profiler.registerClass(SurveyStrategist, 'SurveyStrategist');
