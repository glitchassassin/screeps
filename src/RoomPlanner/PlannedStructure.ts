import { byId } from 'Selectors/byId';
import { viz } from 'Selectors/viz';
import { packPos, unpackPos } from 'utils/packrat';
import profiler from 'utils/profiler';

const PackedStructureTypes: Record<BuildableStructureConstant, string> = {
  [STRUCTURE_CONTAINER]: 'a',
  [STRUCTURE_EXTENSION]: 'b',
  [STRUCTURE_EXTRACTOR]: 'c',
  [STRUCTURE_FACTORY]: 'd',
  [STRUCTURE_LAB]: 'e',
  [STRUCTURE_LINK]: 'f',
  [STRUCTURE_NUKER]: 'g',
  [STRUCTURE_OBSERVER]: 'h',
  [STRUCTURE_POWER_SPAWN]: 'i',
  [STRUCTURE_RAMPART]: 'j',
  [STRUCTURE_ROAD]: 'k',
  [STRUCTURE_SPAWN]: 'l',
  [STRUCTURE_STORAGE]: 'm',
  [STRUCTURE_TERMINAL]: 'n',
  [STRUCTURE_TOWER]: 'o',
  [STRUCTURE_WALL]: 'p'
};
// Lookup table is the same, but inverted, generated once
const PackedStructureTypesLookup: Record<string, BuildableStructureConstant> = Object.entries(
  PackedStructureTypes
).reduce((net, [k, v]) => {
  net[v] = k as BuildableStructureConstant;
  return net;
}, {} as Record<string, BuildableStructureConstant>);

let plannedStructures: Record<string, PlannedStructure> = {};
let deserializedPlannedStructures = new Map<string, PlannedStructure>();

export class PlannedStructure<T extends BuildableStructureConstant = BuildableStructureConstant> {
  public lastSurveyed = 0;
  private lastGet = 0;
  private _structure: Structure<T> | undefined = undefined;
  constructor(public pos: RoomPosition, public structureType: T, public structureId?: Id<Structure<T>>) {
    const key = PackedStructureTypes[structureType] + packPos(pos);
    if (plannedStructures[key]) {
      return plannedStructures[key] as PlannedStructure<T>;
    } else {
      plannedStructures[key] = this;
    }
  }

  get structure() {
    if (Game.time !== this.lastGet) {
      this.survey();
      this._structure = byId(this.structureId);
      this.lastGet = Game.time;
    }
    return this._structure;
  }

  get constructionSite() {
    return Game.rooms[this.pos.roomName]
      ? this.pos.lookFor(LOOK_CONSTRUCTION_SITES).find(c => c.structureType === this.structureType)
      : undefined;
  }

  serialize() {
    return PackedStructureTypes[this.structureType] + packPos(this.pos);
  }
  static deserialize(serialized: string) {
    try {
      const existing = plannedStructures[serialized.slice(0, 3)];
      if (existing) return existing;

      let structureType = PackedStructureTypesLookup[serialized.slice(0, 1)];
      let pos = unpackPos(serialized.slice(1, 3));

      const result = new PlannedStructure(pos, structureType);
      plannedStructures[serialized.slice(0, 3)] = result;
      return result;
    } catch (e) {
      console.log('Deserializing error', serialized);
      throw e;
    }
  }
  survey() {
    if (Game.time === this.lastSurveyed) return !!this.structureId; // Only survey once per tick
    this.lastSurveyed = Game.time;
    if (Game.rooms[this.pos.roomName]) {
      if (byId(this.structureId)) {
        return true; // Actual structure is visible
      } else {
        this.structureId = Game.rooms[this.pos.roomName]
          .lookForAt(LOOK_STRUCTURES, this.pos)
          .find(s => s.structureType === this.structureType)?.id as Id<Structure<T>>;
        if (byId(this.structureId)) return true; // Found structure at expected position
      }
    } else if (this.structureId) {
      return true; // Cached structure exists
    }

    return false; // Structure does not exist
  }
  visualize() {
    if (!this.structure) {
      viz(this.pos.roomName).structure(this.pos.x, this.pos.y, this.structureType);
    }
  }
}

profiler.registerClass(PlannedStructure, 'PlannedStructure');
