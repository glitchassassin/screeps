import { CachedStructure, Structures } from "./Structures"
import { packPos, unpackPos } from "utils/packrat"

import { Office } from "Office/Office"
import { Sources } from "./Sources"
import { countEnergyInContainersOrGround } from "utils/gameObjectSelectors"

declare global {
    namespace GreyCompany {
        type FranchiseCache = {
            containerPosPacked?: string,
            linkPosPacked?: string,
            maxSalesmen?: number
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
}
export type CachedFranchise = {
    id: Id<Source>,
    containerPos?: RoomPosition,
    containerId?: Id<StructureContainer>,
    linkPos?: RoomPosition,
    linkId?: Id<StructureLink>,
    surplus?: number,
    maxSalesmen?: number,
}

export class FranchiseData {
    static byId(id: Id<Source>|undefined): CachedFranchise|undefined {
        if (id === undefined) return undefined;
        let cached = Memory.Franchises?.data[id]
        if (!cached) return;
        let sourcePos = Sources.byId(id)?.pos
        let containerPos = cached.containerPosPacked ? unpackPos(cached.containerPosPacked) : undefined;
        let container = containerPos ? Structures.byPos(containerPos).find(s => s.structureType === STRUCTURE_CONTAINER) as CachedStructure<StructureContainer> : undefined;
        let linkPos = cached.linkPosPacked ? unpackPos(cached.linkPosPacked) : undefined;
        let link = linkPos ? Structures.byPos(linkPos).find(s => s.structureType === STRUCTURE_LINK) as CachedStructure<StructureLink> : undefined;
        return {
            id,
            containerPos,
            containerId: container?.id,
            linkPos,
            linkId: link?.id,
            surplus: sourcePos ? countEnergyInContainersOrGround(sourcePos) : 0
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
        return this.byRoom(office.name);
    }
    static set(id: Id<Source>, franchise: CachedFranchise) {
        Memory.Franchises ??= {idByRoom: {}, data: {}}
        Memory.Franchises.data[id] = {
            containerPosPacked: franchise.containerPos ? packPos(franchise.containerPos) : undefined,
            linkPosPacked: franchise.linkPos ? packPos(franchise.linkPos) : undefined,
            maxSalesmen: franchise.maxSalesmen
        }
    }
}
