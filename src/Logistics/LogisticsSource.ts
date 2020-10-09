import { travel } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/Travel";
import { getCapacity } from "utils/gameObjectSelectors";

type LogisticsSources = Resource<RESOURCE_ENERGY>|StructureStorage|StructureContainer;

/**
 * A cached representation of a Source
 * May be a Franchise, Container, Storage,
 * or just a loose pile of Energy
 */
export class LogisticsSource {
    /**
     *
     * @param pos Center of the source (adjacent squares will also be included)
     * @param primary Only primary Sources can fulfill Resupply requests for non-primary Sources
     */
    constructor(
        public pos: RoomPosition,
        public primary = true
    ) {}

    private _sources: LogisticsSources[] = [];

    public reservedCapacity = 0;

    public get capacity() : number {
        return this.sources.reduce((sum, source) => sum + getCapacity(source), 0) - this.reservedCapacity;
    }

    /**
     * Gets list of surrounding "real" sources,
     * ordered by quantity
     */
    public get sources() : LogisticsSources[] {
        if (!Game.rooms[this.pos.roomName]) return this._sources; // No visibility, use cached

        this._sources = [
            ...this.pos.findInRange(FIND_DROPPED_RESOURCES, 1)
                .filter(r => r.resourceType === RESOURCE_ENERGY) as Resource<RESOURCE_ENERGY>[],
            ...this.pos.findInRange(FIND_STRUCTURES, 1)
                .filter(s => s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) as (StructureContainer|StructureStorage)[]
        ].sort((a, b) => getCapacity(b) - getCapacity(a))

        return this._sources;
    }

    /**
     * Withdraws resources, or moves to the resources, if not
     * adjacent. May return OK while LogisticsSource still has
     * capacity: check creep & source capacity before finishing
     *
     * @param creep Creep to transfer resources into
     */
    transfer(creep: Creep) {
        let source = this.sources[0];
        if (!source) return ERR_NOT_FOUND;
        if (getCapacity(source) === 0) return ERR_NOT_ENOUGH_ENERGY;

        let result;
        if (source instanceof Resource) {
            result = creep.pickup(source);
        } else {
            result = creep.withdraw(source, RESOURCE_ENERGY);
        }

        if (result === ERR_NOT_IN_RANGE) {
            return travel(creep, source.pos);
        }
        return result;
    }

    reserve(amount: number) {
        this.reservedCapacity += amount;
    }
    unreserve(amount: number) {
        this.reservedCapacity -= amount;
    }
}
