import { CachedStructure, Structures } from "./Structures"
import { packPos, unpackPos } from "utils/packrat"

import { Office } from "Office/Office"

declare global {
    namespace GreyCompany {
        type LegalCache = {
            posPacked: string,
            containerPosPacked?: string,
            linkPosPacked?: string,
            rclMilestones?: Record<number, string>,
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
    rclMilestones?: Record<number, string>;
}

export class LegalData {
    static byId(id: Id<StructureController>|undefined): CachedLegal|undefined {
        if (id === undefined) return undefined;
        let cached = Memory.Legal?.data[id]
        if (!cached) return;
        let pos = unpackPos(cached.pos);
        let containerPos = cached.containerPosPacked ? unpackPos(cached.containerPosPacked) : undefined;
        let container = containerPos ? Structures.byPos(containerPos).find(s => s.structureType === STRUCTURE_CONTAINER) as CachedStructure<StructureContainer> : undefined;
        let linkPos = cached.linkPosPacked ? unpackPos(cached.linkPosPacked) : undefined;
        let link = linkPos ? Structures.byPos(linkPos).find(s => s.structureType === STRUCTURE_LINK) as CachedStructure<StructureLink> : undefined;
        return {
            id,
            pos,
            containerPos,
            containerId: container?.id,
            linkPos,
            linkId: link?.id,
            rclMilestones: cached.rclMilestones
        }
    }
    static byRoom(roomName: string) {
        if (!Memory.Legal) {
            return undefined;
        } else {
            return this.byId(Memory.Legal.idByRoom[roomName])
        }
    }
    static byOffice(office: Office): CachedLegal[] {
        let center = this.byRoom(office.name);
        return center ? [center] : []
    }
    static set(id: Id<StructureController>, legal: CachedLegal) {
        Memory.Legal ??= {idByRoom: {}, data: {}}
        Memory.Legal.data[id] = {
            posPacked: packPos(legal.pos),
            containerPosPacked: legal.containerPos ? packPos(legal.containerPos) : undefined,
            linkPosPacked: legal.linkPos ? packPos(legal.linkPos) : undefined,
            rclMilestones: legal.rclMilestones
        }
        Memory.Legal.idByRoom[franchise.pos.roomName] ??= [];
        Memory.Legal.idByRoom[franchise.pos.roomName].push(id);
    }
}
