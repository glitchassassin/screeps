import { Office } from "Office/Office";
import { registerCachePurger } from "./registerCachePurger";

declare global {
    namespace GreyCompany {
        type RoomCache = {
            scanned: number,
            city?: string,
            lastHostileActivity?: number,
            roomPlan?: string,
            territoryOf?: string
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        Rooms?: {
            data: Record<string, GreyCompany.RoomCache>;
        }
    }
}
export type CachedRoom = {
    name: string,
} & GreyCompany.RoomCache

export class RoomData {
    static all(): CachedRoom[] {
        return Object.keys(Memory.Rooms?.data ?? {}).map(r => this.byRoom(r)) as CachedRoom[];
    }
    static byRoom(roomName: string): CachedRoom|undefined {
        let cached = Memory.Rooms?.data[roomName]
        if (!cached) return;
        return {
            name: roomName,
            ...cached
        };
    }
    static byOffice(office: Office): CachedRoom[] {
        let rooms = [];
        for (let room in (Memory.Rooms?.data ?? {})) {
            if (Memory.Rooms?.data[room].territoryOf === office.name) {
                let r = this.byRoom(room);
                if (r) rooms.push(r);
            }
        }
        return rooms;
    }
    static purge() {
        Memory.Rooms = {data: {}}
    }
    static set(roomName: string, room: CachedRoom) {
        Memory.Rooms ??= {data: {}}
        let {name, ...roomCache} = room;
        Memory.Rooms.data[roomName] = roomCache;
    }
}

registerCachePurger(RoomData.purge);
