import { BoardroomManager, BoardroomManagerMemory } from "Boardroom/BoardroomManager";
import { deserialize, serialize, Transform, Type } from "class-transformer";
import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";
import { transformRoomPosition } from "utils/transformGameObject";
import { MapAnalyst } from "./MapAnalyst";

export type Depot = {
    pos: RoomPosition,
    container?: StructureContainer,
    constructionSite?: ConstructionSite
}
class CachedController {
    @Transform(transformRoomPosition)
    public pos: RoomPosition;
    public roomName: string;
    public owner: string|undefined;
    public my: boolean

    constructor(controller: StructureController) {
        this.pos = controller.pos;
        this.roomName = controller.room.name;
        this.owner = controller.owner?.username;
        this.my = controller.my;
    }
}

class ControllerAnalystMemory extends BoardroomManagerMemory {
    @Type(() => CachedController)
    public controllers: Map<string, CachedController> = new Map();
}

export class ControllerAnalyst extends BoardroomManager {
    cache = new ControllerAnalystMemory();

    @Memoize((office: Office) => ('' + office.name + Game.time))
    calculateBestContainerLocation(office: Office) {
        let room = office.center.room;
        if (!room.controller) return null;
        let spawn = Object.values(Game.spawns).find(spawn => spawn.room === room);
        let target = (spawn? spawn.pos : room.getPositionAt(25, 25)) as RoomPosition;
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;

        let candidate: {pos: RoomPosition, range: number}|null = (null as {pos: RoomPosition, range: number}|null);
        mapAnalyst
            .calculateNearbyPositions(room.controller.pos, 3)
            .forEach((pos) => {
                if (mapAnalyst.isPositionWalkable(pos)) {
                    let range = PathFinder.search(pos, target).cost;
                    if (!candidate || candidate.range > range) {
                        candidate = {pos, range};
                    }
                }
            });
        return candidate?.pos;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getDesignatedUpgradingLocations(office: Office) {
        let upgradeDepotFlag = office.center.room.find(FIND_FLAGS)
            .find(flag => flag.name === 'upgradeDepot');
        if (!upgradeDepotFlag) return null;
        let depot: Depot = {
            pos: upgradeDepotFlag.pos
        }
        upgradeDepotFlag.pos.look().forEach(obj => {
            if (obj.type === LOOK_STRUCTURES && obj.structure?.structureType === STRUCTURE_CONTAINER) {
                depot.container = obj.structure as StructureContainer
            } else if (obj.type === LOOK_CONSTRUCTION_SITES && obj.constructionSite?.structureType === STRUCTURE_CONTAINER) {
                depot.constructionSite = obj.constructionSite as ConstructionSite
            }
        });
        return depot;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getReservingControllers(office: Office) {
        return office.territories
            .filter(t => t.room?.controller)
            .map(t => t.room?.controller) as StructureController[]
    }
}
