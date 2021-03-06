import { MemoizeByTick } from "utils/memoize";
import { Office } from "Office/Office";
import { RoomData } from "./Rooms";
import { packPos } from "utils/packrat";
import profiler from "screeps-profiler";

declare global {
    namespace NodeJS {
        interface Global {
            Resources: typeof Resources
        }
    }
}

export class Resources {
    static byId(id: Id<Resource>|undefined): Resource|undefined {
        if (id === undefined) return undefined;
        return Game.getObjectById(id) ?? undefined
    }
    static byRoom<T extends ResourceConstant = ResourceConstant>(roomName: string, resource?: T): Resource<T>[] {
        let resources: Resource<T>[] = [];
        if (Game.rooms[roomName]) {
            // We have vision here
            resources = Game.rooms[roomName].find(FIND_DROPPED_RESOURCES, {filter: {resourceType: resource}}) as Resource<T>[];
        }
        return resources;
    }
    static byOffice<T extends ResourceConstant = ResourceConstant>(office: Office, resource?: T): Resource<T>[] {
        return RoomData.byOffice(office).flatMap(r => this.byRoom(r.name, resource));
    }
    @MemoizeByTick((pos: RoomPosition, resource: ResourceConstant) => resource + packPos(pos))
    static byPos<T extends ResourceConstant = ResourceConstant>(pos: RoomPosition, resource?: T): Resource<T>[] {
        let resources: Resource[] = [];
        if (Game.rooms[pos.roomName]) {
            // We have vision here
            let resources = pos.lookFor(LOOK_RESOURCES);
        }

        if (resource) {
            return resources.filter(r => r.resourceType === resource) as Resource<T>[];
        } else {
            return resources as Resource<T>[];
        }
    }
}

global.Resources = Resources;

profiler.registerClass(Resources, 'Resources');
