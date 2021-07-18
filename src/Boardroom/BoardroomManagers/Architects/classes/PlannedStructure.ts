import { CachedStructure, Structures } from "WorldState/Structures";
import { packPos, unpackPos } from "utils/packrat";

import type { BuildRequest } from "BehaviorTree/requests/Build";
import type { RepairRequest } from "BehaviorTree/requests/Repair";
import { byId } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

const PackedStructureTypes: Record<BuildableStructureConstant, string> = {
    [STRUCTURE_CONTAINER]:      'a',
    [STRUCTURE_EXTENSION]:      'b',
    [STRUCTURE_EXTRACTOR]:      'c',
    [STRUCTURE_FACTORY]:        'd',
    [STRUCTURE_LAB]:            'e',
    [STRUCTURE_LINK]:           'f',
    [STRUCTURE_NUKER]:          'g',
    [STRUCTURE_OBSERVER]:       'h',
    [STRUCTURE_POWER_SPAWN]:    'i',
    [STRUCTURE_RAMPART]:        'j',
    [STRUCTURE_ROAD]:           'k',
    [STRUCTURE_SPAWN]:          'l',
    [STRUCTURE_STORAGE]:        'm',
    [STRUCTURE_TERMINAL]:       'n',
    [STRUCTURE_TOWER]:          'o',
    [STRUCTURE_WALL]:           'p',
}
// Lookup table is the same, but inverted, generated once
const PackedStructureTypesLookup: Record<string, BuildableStructureConstant> = Object.entries(PackedStructureTypes).reduce(
    (net, [k, v]) => {
        net[v] = k as BuildableStructureConstant;
        return net;
    }, {} as Record<string, BuildableStructureConstant>
)

export class PlannedStructure<T extends BuildableStructureConstant = BuildableStructureConstant> {
    constructor(
        public pos: RoomPosition,
        public structureType: T
    ) {}
    structure?: CachedStructure<Structure<T>>;
    buildRequest?: BuildRequest;
    repairRequest?: RepairRequest;

    serialize() {
        return PackedStructureTypes[this.structureType] + packPos(this.pos);
    }
    static deserialize(serialized: string) {
        let structureType = PackedStructureTypesLookup[serialized.slice(0, 1)]
        let pos = unpackPos(serialized.slice(1, 3))
        return new PlannedStructure(pos, structureType)
    }
    survey() {
        if (Game.rooms[this.pos.roomName]) {
            if (byId(this.structure?.id)) {
                return true; // Actual structure is visible
            } else {
                this.structure = Structures.byPos(this.pos).find(s => s.structureType === this.structureType) as CachedStructure<Structure<T>>;
                if (this.structure) return true; // Found structure at expected position
            }
        } else if (this.structure){
            return true; // Cached structure exists
        }

        if (this.buildRequest && !this.buildRequest.result) {
            // Structure is being built
            return false;
        }
        return false; // Structure does not exist
    }
    visualize() {
        let vis = new RoomVisual(this.pos.roomName);
        if (!this.structure) {
            vis.structure(this.pos.x, this.pos.y, this.structureType);
        }
    }
}

profiler.registerClass(PlannedStructure, 'PlannedStructure')
