import { ExploreRequest } from "BehaviorTree/requests/Explore";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { SecurityManager } from "../SecurityManager";
import { getRcl } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

export class SurveyStrategist extends OfficeManager {
    public request?: MinionRequest;

    plan() {
        let defenseManager = this.office.managers.get('SecurityManager') as SecurityManager;

        if (this.request && !this.request.result) return;

        if (getRcl(this.office.name) !== 8) {
            // Handle scouting with minions
            this.request = new ExploreRequest(this.getRoomToScout())
            defenseManager.submit(this.request);
        } else {
            // TODO: Handle scouting with observers
        }
    }

    getRoomToScout() {
        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;
        let surveyRadius = (getRcl(this.office.name) !== 8) ? 5 : 20

        let rooms = mapAnalyst.calculateNearbyRooms(this.office.name, surveyRadius, false);

        let bestMatch: {distance: number, name: string, lastScanned: number}|undefined = undefined;

        for (let room of rooms) {
            let match = {
                distance: mapAnalyst.getRangeTo(new RoomPosition(25, 25, this.office.name), new RoomPosition(25, 25, room)),
                name: room,
                lastScanned: global.worldState.rooms.byRoom.get(room)?.scanned ?? 0
            }
            // If no existing match, OR
            // this match is closer AND older than the best match,
            // then this is the best match
            if (
                !bestMatch ||
                (match.distance < bestMatch.distance && match.lastScanned <= bestMatch.lastScanned)
            ) {
                bestMatch = match;
            }
        }
        if (!bestMatch) throw new Error('Error selecting a room to scout');
        return bestMatch.name;
    }
}
profiler.registerClass(SurveyStrategist, 'SurveyStrategist');
