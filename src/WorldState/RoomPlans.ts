import { ExtensionsPlan } from "Boardroom/BoardroomManagers/Architects/ExtensionsPlan";
import { FranchisePlan } from "Boardroom/BoardroomManagers/Architects/FranchisePlan";
import { HeadquartersPlan } from "Boardroom/BoardroomManagers/Architects/HeadquartersPlan";
import { MinePlan } from "Boardroom/BoardroomManagers/Architects/MinePlan";
import { Office } from "Office/Office";
import { RoomData } from "./Rooms";
import { TerritoryFranchisePlan } from "Boardroom/BoardroomManagers/Architects/TerritoryFranchise";
import { registerCachePurger } from "./registerCachePurger";

declare global {
    namespace GreyCompany {
        type RoomPlanCache = {
            results: {
                office?: string,
                territory?: string
            },
            office?: {
                headquarters: string,
                franchise1: string,
                franchise2: string,
                mine: string,
                extensions: string,
            },
            territory?: {
                franchise1: string,
                franchise2?: string,
            }
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        RoomPlans?: {
            data: Record<string, GreyCompany.RoomPlanCache>;
        }
    }
    namespace NodeJS {
        interface Global {
            RoomPlanData: typeof RoomPlanData
        }
    }
}
export type CachedRoomPlan = {
    results: {
        office?: string,
        territory?: string,
    },
    office?: {
        headquarters: HeadquartersPlan,
        franchise1: FranchisePlan,
        franchise2: FranchisePlan,
        mine: MinePlan,
        extensions: ExtensionsPlan,
    },
    territory?: {
        franchise1: TerritoryFranchisePlan,
        franchise2?: TerritoryFranchisePlan,
    }
}

export class RoomPlanData {
    static all(): CachedRoomPlan[] {
        return Object.keys(Memory.RoomPlans?.data ?? {}).map(r => this.byRoom(r)) as CachedRoomPlan[];
    }
    static byRoom(roomName: string): CachedRoomPlan|undefined {
        let cached = Memory.RoomPlans?.data[roomName]
        if (!cached) return;
        try {
            let office;
            if (cached.office) {
                office = {
                    headquarters: new HeadquartersPlan(cached.office.headquarters),
                    franchise1: new FranchisePlan(cached.office.franchise1),
                    franchise2: new FranchisePlan(cached.office.franchise2),
                    mine: new MinePlan(cached.office.mine),
                    extensions: new ExtensionsPlan(cached.office.extensions),
                }
                let hq = new HeadquartersPlan(cached.office.headquarters)
            }
            let territory;
            if (cached.territory) {
                territory = {
                    franchise1: new TerritoryFranchisePlan(cached.territory.franchise1),
                    franchise2: cached.territory.franchise2 ? new TerritoryFranchisePlan(cached.territory.franchise2) : undefined,
                }
            }
            return {
                results: cached.results,
                office,
                territory
            }
        } catch (e) {
            console.log(`Error reconstituting RoomPlanData for room ${roomName}`, e.message);
            delete Memory.RoomPlans?.data[roomName]
            return;
        }
    }
    static byOffice(office: Office): CachedRoomPlan[] {
        let rooms = [];
        for (let room in (Memory.RoomPlans?.data ?? {})) {
            if (room === office.name || RoomData.byRoom(room)?.territoryOf === office.name) {
                let r = this.byRoom(room);
                if (r) rooms.push(r);
            }
        }
        return rooms;
    }
    static purge() {
        Memory.RoomPlans = {data: {}}
    }
    static set(roomName: string, room: CachedRoomPlan) {
        Memory.RoomPlans ??= {data: {}}
        let office;
        if (room.office) {
            office = {
                headquarters: room.office.headquarters.blockPlan.serialize(),
                franchise1: room.office.franchise1.blockPlan.serialize(),
                franchise2: room.office.franchise2.blockPlan.serialize(),
                mine: room.office.mine.blockPlan.serialize(),
                extensions: room.office.extensions.blockPlan.serialize(),
            }
        }
        let territory;
        if (room.territory) {
            territory = {
                franchise1: room.territory.franchise1.blockPlan.serialize(),
                franchise2: room.territory.franchise2?.blockPlan.serialize(),
            }
        }
        Memory.RoomPlans.data[roomName] = { results: room.results, office, territory }
    }
}

global.RoomPlanData = RoomPlanData;

registerCachePurger(RoomPlanData.purge);
