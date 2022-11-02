import { BARRIER_LEVEL, BARRIER_TYPES } from 'config';
import { byId } from 'Selectors/byId';
import { rcl } from 'Selectors/rcl';
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
  constructor(public pos: RoomPosition, public structureType: T, public structureId?: Id<Structure<T>>) {
    const key = PackedStructureTypes[structureType] + packPos(pos);
    if (plannedStructures[key]) {
      return plannedStructures[key] as PlannedStructure<T>;
    } else {
      plannedStructures[key] = this;
    }
  }

  public energyToBuild = 0;
  public energyToRepair = 0;

  get structure() {
    this.survey();
    return byId(this.structureId) as ConcreteStructure<T> | undefined;
  }

  public constructionSiteId?: Id<ConstructionSite<T>>;
  get constructionSite() {
    this.survey();
    return byId(this.constructionSiteId) as ConstructionSite<T> | undefined;
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

  public lastSurveyed = 0;
  survey() {
    if (Game.time === this.lastSurveyed) return !!this.structureId; // Only survey once per tick
    this.lastSurveyed = Game.time;
    if (Game.rooms[this.pos.roomName]) {
      if (!byId(this.structureId)) {
        this.structureId = undefined;
      }
      this.structureId ??= Game.rooms[this.pos.roomName]
        .lookForAt(LOOK_STRUCTURES, this.pos)
        .find(s => s.structureType === this.structureType && (!('my' in s) || (s as OwnedStructure).my))?.id as Id<
        Structure<T>
      >;
      const structure = byId(this.structureId);
      if (structure) {
        this.energyToBuild = 0;
        const hitsMax = BARRIER_TYPES.includes(structure.structureType)
          ? BARRIER_LEVEL[rcl(structure.pos.roomName)]
          : structure.hitsMax;
        this.energyToRepair = (hitsMax - structure.hits) * REPAIR_COST;
        return true; // Actual structure is visible
      } else {
        if (!byId(this.constructionSiteId)) {
          this.constructionSiteId = undefined;
        }
        this.constructionSiteId ??= Game.rooms[this.pos.roomName]
          ? this.pos
              .lookFor(LOOK_CONSTRUCTION_SITES)
              .find((c): c is ConstructionSite<T> => c.my && c.structureType === this.structureType)?.id
          : undefined;
        const constructionSite = byId(this.constructionSiteId);
        if (constructionSite) {
          this.energyToBuild = constructionSite.progressTotal - constructionSite.progress;
          this.energyToRepair = 0;
        } else {
          this.energyToBuild = CONSTRUCTION_COST[this.structureType];
          this.energyToRepair = 0;
        }
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
