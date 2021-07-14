import { CachedStructure, Structures } from "./Structures"
import { packPos, unpackPos } from "utils/packrat"

import { Office } from "Office/Office"
import { RoomData } from "./Rooms"
import { registerCachePurger } from "./registerCachePurger"

declare global {
    namespace GreyCompany {
        type MineCache = {
            posPacked: string,
            containerPosPacked?: string,
            containerId?: Id<StructureContainer>,
            extractorId?: Id<StructureExtractor>,
            maxForemen?: number,
            distance?: number
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        Mines?: {
            idByRoom: Record<string, Id<Mineral>[]>;
            data: Record<string, GreyCompany.MineCache>;
        }
    }
    namespace NodeJS {
        interface Global {
            MineData: typeof MineData
        }
    }
}
export type CachedMine = {
    id: Id<Mineral>,
    pos: RoomPosition,
    distance?: number,
    containerPos?: RoomPosition,
    containerId?: Id<StructureContainer>,
    extractorId?: Id<StructureExtractor>,
    maxForemen?: number,
}

export const MineData = {
    byId(id: Id<Mineral>|undefined): CachedMine|undefined {
        if (id === undefined) return undefined;
        let cached = Memory.Mines?.data[id]
        if (!cached) return;
        let pos = unpackPos(cached.posPacked);
        let containerPos = cached.containerPosPacked ? unpackPos(cached.containerPosPacked) : undefined;
        let container = Structures.byId(cached.containerId) ?? (
            containerPos ?
                Structures.byPos(containerPos).find(s => s.structureType === STRUCTURE_CONTAINER) as CachedStructure<StructureContainer> :
                undefined
        );
        let extractor = Structures.byId(cached.extractorId) ?? (
            pos ? Structures.byPos(pos).find(s => s.structureType === STRUCTURE_EXTRACTOR) as CachedStructure<StructureExtractor> :
            undefined
        );
        return {
            id,
            pos,
            containerPos,
            containerId: container?.id,
            extractorId: extractor?.id,
            maxForemen: cached.maxForemen,
            distance: cached.distance
        }
    },
    byRoom(roomName: string): CachedMine[] {
        if (!Memory.Mines) {
            return [];
        } else {
            return Memory.Mines.idByRoom[roomName]
                ?.map(id => this.byId(id))
                .filter(site => site !== undefined) as CachedMine[] ?? []
        }
    },
    byOffice(office: Office): CachedMine[] {
        return RoomData.byOffice(office).flatMap(r => this.byRoom(r.name));
    },
    purge() {
        Memory.Mines = {idByRoom: {}, data: {}}
    },
    set(id: Id<Mineral>, mine: CachedMine, roomName: string) {
        Memory.Mines ??= {idByRoom: {}, data: {}}
        Memory.Mines.data[id] = {
            posPacked: packPos(mine.pos),
            containerId: mine.containerId,
            containerPosPacked: mine.containerPos ? packPos(mine.containerPos) : undefined,
            extractorId: mine.extractorId,
            maxForemen: mine.maxForemen,
            distance: mine.distance
        }
        Memory.Mines.idByRoom[roomName] ??= [];
        if (!Memory.Mines.idByRoom[roomName].includes(id)) {
            Memory.Mines.idByRoom[roomName].push(id);
        }
    }
}

global.MineData = MineData;

registerCachePurger(MineData.purge);
