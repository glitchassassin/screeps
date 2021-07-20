import type { Route, SerializedRoute } from "WorldState/LogisticsRouteModel";
import { deserializeRoute, serializeRoute } from "WorldState/LogisticsRouteModel";

import { Office } from "Office/Office";
import { RoomData } from "./Rooms";
import profiler from "screeps-profiler";
import { registerCachePurger } from "./registerCachePurger";

declare global {
    namespace GreyCompany {
        type LogisticsRouteCache = {
            office?: {
                sources: SerializedRoute,
                towers: SerializedRoute,
                extensionsAndSpawns: SerializedRoute,
                controller: SerializedRoute,
            },
            territory?: {
                sources: SerializedRoute,
            }
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        LogisticsRoutes?: {
            data: Record<string, GreyCompany.LogisticsRouteCache>;
        }
    }
    namespace NodeJS {
        interface Global {
            LogisticsRouteData: typeof LogisticsRouteData
        }
    }
}
export type CachedLogisticsRoute = {
    office?: {
        sources: Route,
        towers: Route,
        extensionsAndSpawns: Route,
        controller: Route,
    },
    territory?: {
        sources: Route,
    }
}

export class LogisticsRouteData {
    static all(): CachedLogisticsRoute[] {
        return Object.keys(Memory.LogisticsRoutes?.data ?? {}).map(r => this.byRoom(r)) as CachedLogisticsRoute[];
    }
    static byRoom(roomName: string): CachedLogisticsRoute|undefined {
        let cached = Memory.LogisticsRoutes?.data[roomName]
        if (!cached) return;
        try {
            let office;
            if (cached.office) {
                office = {
                    sources: deserializeRoute(cached.office.sources),
                    towers: deserializeRoute(cached.office.towers),
                    extensionsAndSpawns: deserializeRoute(cached.office.extensionsAndSpawns),
                    controller: deserializeRoute(cached.office.controller),
                }
            }
            let territory;
            if (cached.territory) {
                territory = {
                    sources: deserializeRoute(cached.territory.sources),
                }
            }
            return {
                office,
                territory
            }
        } catch {
            delete Memory.LogisticsRoutes?.data[roomName]
            return;
        }
    }
    static byOffice(office: Office): CachedLogisticsRoute[] {
        let rooms = [];
        for (let room in (Memory.LogisticsRoutes?.data ?? {})) {
            if (room === office.name || RoomData.byRoom(room)?.territoryOf === office.name) {
                let r = this.byRoom(room);
                if (r) rooms.push(r);
            }
        }
        return rooms;
    }
    static purge() {
        Memory.LogisticsRoutes = {data: {}}
    }
    static set(roomName: string, room: CachedLogisticsRoute) {
        Memory.LogisticsRoutes ??= {data: {}}
        let office;
        if (room.office) {
            office = {
                sources: serializeRoute(room.office.sources),
                towers: serializeRoute(room.office.towers),
                extensionsAndSpawns: serializeRoute(room.office.extensionsAndSpawns),
                controller: serializeRoute(room.office.controller),
            }
        }
        let territory;
        if (room.territory) {
            territory = {
                sources: serializeRoute(room.territory.sources),
            }
        }
        Memory.LogisticsRoutes.data[roomName] = { office, territory }
    }
}

global.LogisticsRouteData = LogisticsRouteData;

registerCachePurger(LogisticsRouteData.purge);

profiler.registerClass(LogisticsRouteData, 'LogisticsRouteData');
