import { packPos, unpackPos } from "utils/packrat";

import { Office } from "Office/Office";
import { registerCachePurger } from "./registerCachePurger";
import { registerCacheRefresher } from "./registerCacheRefresher";

declare global {
    namespace GreyCompany {
        type ControllerCache = {
            posPacked: string,
            level: number,
            owner?: string,
            reservationOwner?: string,
            reservationEndTime?: number,
            upgradeBlockedTime?: number
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        Controllers?: {
            idByRoom: Record<string, Id<StructureController>>;
            data: Record<string, GreyCompany.ControllerCache>;
        }
    }
}
export type CachedController = StructureController | {
    pos: RoomPosition,
    id: Id<StructureController>,
    level: number,
    my: boolean,
    owner?: {
        username: string
    },
    reservation: {
        username?: string,
        ticksToEnd?: number
    },
    upgradeBlocked?: number
}

export class Controllers {
    static byId(id: Id<StructureController>|undefined): CachedController|undefined {
        if (id === undefined) return undefined;
        let site = Game.getObjectById(id)
        if (!site) {
            let cached = Memory.Controllers?.data[id]
            if (!cached) return;
            return {
                id: id,
                pos: unpackPos(cached.posPacked),
                level: cached.level,
                my: (cached.owner === 'LordGreywether'),
                owner: cached.owner ? {
                    username: cached.owner
                } : undefined,
                reservation: {
                    username: cached.reservationOwner,
                    ticksToEnd: cached.reservationEndTime ? cached.reservationEndTime - Game.time : undefined
                },
                upgradeBlocked: cached.upgradeBlockedTime ? cached.upgradeBlockedTime - Game.time : undefined
            }
        }
        return site;
    }
    static byRoom(roomName: string): CachedController|undefined {
        if (Game.rooms[roomName]) {
            // We have vision here
            return Game.rooms[roomName].controller
        } else if (!Memory.Controllers) {
            return;
        } else {
            return this.byId(Memory.Controllers.idByRoom[roomName])
        }
    }
    static byOffice(office: Office): CachedController[] {
        let controller = this.byRoom(office.name);
        return controller ? [controller] : [];
    }
    static purge() {
        Memory.Controllers = {idByRoom: {}, data: {}};
    }
    static refreshCache() {
        // Initialize the Heap branch, if necessary
        Memory.Controllers ??= {idByRoom: {}, data: {}};

        for (let roomName in Game.rooms) {
            // We only need to cache if controller is unowned
            let controller = Game.rooms[roomName].controller
            if (controller && !controller.my) {
                Memory.Controllers.idByRoom[roomName] = controller.id;
                // Cache capacities for each reController type
                Memory.Controllers.data[controller.id] ??= {
                    posPacked: packPos(controller.pos),
                    level: controller.level,
                    owner: controller.owner?.username,
                    reservationOwner: controller.reservation?.username,
                    reservationEndTime: controller.reservation?.ticksToEnd ? Game.time + controller.reservation.ticksToEnd : undefined,
                    upgradeBlockedTime: controller.upgradeBlocked ? Game.time + controller.upgradeBlocked : undefined,
                };
            } else {
                delete Memory.Controllers.idByRoom[roomName];
            }
        }
    }
}

// Register the cache refresh
registerCacheRefresher(Controllers.refreshCache);
registerCachePurger(Controllers.purge);
