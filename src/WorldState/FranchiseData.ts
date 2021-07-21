import { packPos, unpackPos } from "utils/packrat"

import { Office } from "Office/Office"
import { RoomData } from "./Rooms"
import { Structures } from "./Structures"
import profiler from "screeps-profiler"
import { registerCachePurger } from "./registerCachePurger"

declare global {
    namespace GreyCompany {
        type FranchiseCache = {
            posPacked: string,
            containerPosPacked?: string,
            containerId?: Id<StructureContainer>,
            linkPosPacked?: string,
            linkId?: Id<StructureLink>,
            spawnPosPacked?: string,
            spawnId?: Id<StructureSpawn>,
            maxSalesmen?: number,
            distance?: number
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        Franchises?: {
            idByRoom: Record<string, Id<Source>[]>;
            data: Record<string, GreyCompany.FranchiseCache>;
        }
    }
    namespace NodeJS {
        interface Global {
            FranchiseData: typeof FranchiseData
        }
    }
}
export type CachedFranchise = {
    id: Id<Source>,
    pos: RoomPosition,
    distance?: number,
    containerPos?: RoomPosition,
    containerId?: Id<StructureContainer>,
    linkPos?: RoomPosition,
    linkId?: Id<StructureLink>,
    spawnPos?: RoomPosition,
    spawnId?: Id<StructureSpawn>,
    maxSalesmen?: number,
}

export class FranchiseData {
    static byId(id: Id<Source>|undefined): CachedFranchise|undefined {
        if (id === undefined) return undefined;
        let cached = Memory.Franchises?.data[id]
        if (!cached) return;
        let pos = unpackPos(cached.posPacked);
        let containerPos = cached.containerPosPacked ? unpackPos(cached.containerPosPacked) : undefined;
        let container = Structures.byId(cached.containerId);
        let linkPos = cached.linkPosPacked ? unpackPos(cached.linkPosPacked) : undefined;
        let link = Structures.byId(cached.linkId);
        let spawnPos = cached.spawnPosPacked ? unpackPos(cached.spawnPosPacked) : undefined;
        let spawn = Structures.byId(cached.spawnId);
        return {
            id,
            pos,
            containerPos,
            containerId: container?.id,
            linkPos,
            linkId: link?.id,
            spawnPos,
            spawnId: spawn?.id,
            maxSalesmen: cached.maxSalesmen,
            distance: cached.distance
        }
    }
    static byRoom(roomName: string): CachedFranchise[] {
        if (!Memory.Franchises) {
            return [];
        } else {
            return Memory.Franchises.idByRoom[roomName]
                ?.map(id => this.byId(id))
                .filter(site => site !== undefined) as CachedFranchise[] ?? []
        }
    }
    static byOffice(office: Office): CachedFranchise[] {
        return RoomData.byOffice(office).flatMap(r => this.byRoom(r.name));
    }
    static purge() {
        Memory.Franchises = {idByRoom: {}, data: {}}
    }
    static set(id: Id<Source>, franchise: CachedFranchise, roomName: string) {
        Memory.Franchises ??= {idByRoom: {}, data: {}}
        Memory.Franchises.data[id] = {
            posPacked: packPos(franchise.pos),
            containerId: franchise.containerId,
            containerPosPacked: franchise.containerPos ? packPos(franchise.containerPos) : undefined,
            linkId: franchise.linkId,
            linkPosPacked: franchise.linkPos ? packPos(franchise.linkPos) : undefined,
            spawnId: franchise.spawnId,
            spawnPosPacked: franchise.spawnPos ? packPos(franchise.spawnPos) : undefined,
            maxSalesmen: franchise.maxSalesmen,
            distance: franchise.distance
        }
        Memory.Franchises.idByRoom[roomName] ??= [];
        if (!Memory.Franchises.idByRoom[roomName].includes(id)) {
            Memory.Franchises.idByRoom[roomName].push(id);
        }
    }
}

global.FranchiseData = FranchiseData;

registerCachePurger(FranchiseData.purge);

profiler.registerClass(FranchiseData, 'FranchiseData')
