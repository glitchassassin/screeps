import { byId } from "Selectors/byId";
import { packPos, unpackPos } from "utils/packrat";
import profiler from "utils/profiler";


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

const EMPTY_ID = '                        ';

let plannedStructures: Record<string, PlannedStructure> = {};
let deserializedPlannedStructures = new Map<string, PlannedStructure>();

export class PlannedStructure<T extends BuildableStructureConstant = BuildableStructureConstant> {
    private lastSurveyed = 0;
    private lastGet = 0;
    private _structure: Structure<T>|undefined = undefined;
    constructor(
        public pos: RoomPosition,
        public structureType: T,
        public structureId?: Id<Structure<T>>
    ) {
        const key = packPos(pos) + structureType;
        if (plannedStructures[key]) {
            return plannedStructures[key] as PlannedStructure<T>;
        } else {
            plannedStructures[key] = this;
        }
    }

    get structure() {
        if (Game.time !== this.lastGet) {
            this._structure = byId(this.structureId);
            this.lastGet = Game.time;
        }
        return this._structure;
    }

    get constructionSite() {
        return this.pos.lookFor(LOOK_CONSTRUCTION_SITES).find(c => c.structureType === this.structureType);
    }

    serialize() {
        return PackedStructureTypes[this.structureType] +
               packPos(this.pos) +
               (this.structureId ? this.structureId as string : EMPTY_ID);
    }
    static deserialize(serialized: string) {
        const existing = deserializedPlannedStructures.get(serialized.slice(0, 3));
        if (existing) return existing;

        let structureType = PackedStructureTypesLookup[serialized.slice(0, 1)];
        let pos = unpackPos(serialized.slice(1, 3));
        let id = serialized.slice(3, 27) as Id<Structure<BuildableStructureConstant>> | undefined;
        if (id === EMPTY_ID) id = undefined;

        const result = new PlannedStructure(pos, structureType, id);
        deserializedPlannedStructures.set(serialized.slice(0, 3), result);
        return result;
    }
    survey() {
        if (Game.time === this.lastSurveyed) return !!byId(this.structureId); // Only survey once per tick
        if (Game.rooms[this.pos.roomName]) {
            if (byId(this.structureId)) {
                return true; // Actual structure is visible
            } else {
                this.structureId = Game.rooms[this.pos.roomName].lookForAt(LOOK_STRUCTURES, this.pos).find(s => s.structureType === this.structureType)?.id as Id<Structure<T>>;
                if (byId(this.structureId)) return true; // Found structure at expected position
            }
        } else if (this.structureId){
            return true; // Cached structure exists
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
