import { CachedConstructionSite } from "WorldState/ConstructionSites";
import { Capacity } from "WorldState/Capacity";
import { Controllers } from "WorldState/Controllers";
import { Health } from "WorldState/Health";

export function getBuildEnergyRemaining(target: CachedConstructionSite) {
    return (target.progressTotal ?? 0) - (target.progress ?? 0);
}
export function getRepairEnergyRemaining(target: Id<Structure>) {
    let health = Health.byId(target);
    return ((health?.hitsMax ?? 0) - (health?.hits ?? 0))/100;
}
export function getTransferEnergyRemaining(target: Id<AnyStoreStructure>) {
    let capacity = Capacity.byId(target, RESOURCE_ENERGY);
    return capacity?.free
}
export function getCreepHomeOffice(creep: Creep) {
    if (!creep.memory.office) return;
    return global.boardroom.offices.get(creep.memory.office);
}

export function RoomPos(pos: {x: number, y: number, roomName: string}) {
    return new RoomPosition(pos.x, pos.y, pos.roomName);
}

export function buildPriority(site: CachedConstructionSite) {
    // Adds a fractional component to sub-prioritize the most
    // complete construction sites
    let completion = (site.progress ?? 0) / (site.progressTotal ?? 0);
    switch(site.structureType) {
        case STRUCTURE_ROAD:
            return 1 + completion;
        case STRUCTURE_CONTAINER:
            return 10 + completion;
        case STRUCTURE_EXTENSION:
            return 12 + completion;
        default:
            return 5 + completion;
    }
}

export function rclIsGreaterThan(roomName: string, level: number) {
    let roomLevel = Controllers.byRoom(roomName)?.level;
    return (roomLevel && roomLevel > level);
}

export function getRcl(roomName: string) {
    return Controllers.byRoom(roomName)?.level;
}

export function getCreepsById(...args: Id<Creep>[]) {
    return args.map(id => Game.getObjectById(id)).filter(c => c !== null) as Creep[];
}

export function byId<T>(id: Id<T>|undefined) {
    return id ? Game.getObjectById(id) ?? undefined : undefined
}
