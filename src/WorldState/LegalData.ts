import { packPos, unpackPos } from "utils/packrat"

import { Office } from "Office/Office"
import { Structures } from "./Structures"
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
    namespace NodeJS {
        interface Global {
            LegalData: typeof LegalData
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

export class LegalData {
    static byId(id: Id<StructureController>|undefined): CachedLegal|undefined {
        if (id === undefined) return undefined;
        let cached = Memory.Legal?.data[id]
        if (!cached) return;
        let pos = unpackPos(cached.posPacked);
        let containerPos = cached.containerPosPacked ? unpackPos(cached.containerPosPacked) : undefined;
        let container = Structures.byId(cached.containerId);
        let linkPos = cached.linkPosPacked ? unpackPos(cached.linkPosPacked) : undefined;
        let link = Structures.byId(cached.linkId);
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
    static purge() {
        Memory.Legal = {idByRoom: {}, data: {}}
    }
    static set(id: Id<StructureController>, legal: CachedLegal, roomName: string) {
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

global.LegalData = LegalData;

registerCachePurger(LegalData.purge);

profiler.registerClass(LegalData, 'LegalData')
