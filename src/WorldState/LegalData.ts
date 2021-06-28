import { CachedStructure, Structures } from "./Structures"
import { packPos, unpackPos } from "utils/packrat"

import { Office } from "Office/Office"
import profiler from "screeps-profiler"
import { registerCachePurger } from "./registerCachePurger"

declare global {
    namespace GreyCompany {
        type LegalCache = {
            posPacked: string,
            containerId?: Id<StructureContainer>,
            containerPosPacked?: string,
            linkId?: Id<StructureLink>,
            linkPosPacked?: string,
            rclMilestones?: Record<number, number>,
        }
    }
    interface Memory {
        Legal?: {
            idByRoom: Record<string, Id<StructureController>>;
            data: Record<string, GreyCompany.LegalCache>;
        }
    }
}
export type CachedLegal = {
    id: Id<StructureController>,
    pos: RoomPosition,
    containerPos?: RoomPosition,
    containerId?: Id<StructureContainer>,
    linkPos?: RoomPosition,
    linkId?: Id<StructureLink>,
    rclMilestones?: Record<number, number>;
}

export const LegalData = {
    byId(id: Id<StructureController>|undefined): CachedLegal|undefined {
        if (id === undefined) return undefined;
        let cached = Memory.Legal?.data[id]
        if (!cached) return;
        let pos = unpackPos(cached.posPacked);
        let containerPos = cached.containerPosPacked ? unpackPos(cached.containerPosPacked) : undefined;
        let container = Structures.byId(cached.containerId) ?? (
            containerPos ? Structures.byPos(containerPos).find(s => s.structureType === STRUCTURE_CONTAINER) as CachedStructure<StructureContainer> : undefined
        );
        let linkPos = cached.linkPosPacked ? unpackPos(cached.linkPosPacked) : undefined;
        let link = Structures.byId(cached.linkId) ?? (
            linkPos ? Structures.byPos(linkPos).find(s => s.structureType === STRUCTURE_LINK) as CachedStructure<StructureLink> : undefined
        );
        return {
            id,
            pos,
            containerPos,
            containerId: container?.id,
            linkPos,
            linkId: link?.id,
            rclMilestones: cached.rclMilestones
        }
    },
    byRoom(roomName: string) {
        if (!Memory.Legal) {
            return undefined;
        } else {
            return this.byId(Memory.Legal.idByRoom[roomName])
        }
    },
    byOffice(office: Office): CachedLegal[] {
        let center = this.byRoom(office.name);
        return center ? [center] : []
    },
    purge() {
        Memory.Legal = {idByRoom: {}, data: {}}
    },
    set(id: Id<StructureController>, legal: CachedLegal, roomName: string) {
        Memory.Legal ??= {idByRoom: {}, data: {}}
        Memory.Legal.data[id] = {
            posPacked: packPos(legal.pos),
            containerId: legal.containerId,
            containerPosPacked: legal.containerPos ? packPos(legal.containerPos) : undefined,
            linkId: legal.linkId,
            linkPosPacked: legal.linkPos ? packPos(legal.linkPos) : undefined,
            rclMilestones: legal.rclMilestones
        }
        Memory.Legal.idByRoom[roomName] = id;
    }
}


registerCachePurger(LegalData.purge);

profiler.registerObject(LegalData, 'LegalData')
