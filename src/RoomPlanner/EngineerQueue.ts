import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { plannedStructuresByRcl } from 'Selectors/plannedStructuresByRcl';
import { rcl } from 'Selectors/rcl';
import { roomPlans } from 'Selectors/roomPlans';
import { schedule } from 'Selectors/scheduledCallbacks';
import { repairThreshold } from 'Selectors/Structures/repairThreshold';
import { memoize, memoizeOncePerTick } from 'utils/memoizeFunction';
import { PlannedStructure } from './PlannedStructure';

const queues = new Map<string, EngineerQueue>();

export class EngineerQueue {
  constructor(public office: string) {
    const instance = queues.get(office);
    if (instance) return instance;
    queues.set(this.office, this);
  }
  build = new Set<PlannedStructure>();
  maintain_barriers = new Set<PlannedStructure>();
  maintain_economy = new Set<PlannedStructure>();
  maintain_other = new Set<PlannedStructure>();

  survey = memoize(
    () => `${rcl(this.office)}${Game.rooms[this.office].find(FIND_STRUCTURES).length}`,
    () => {
      for (const structure of plannedStructuresByRcl(this.office)) {
        this.surveyStructure(structure);
      }
    },
    100
  );

  surveyStructure(structure: PlannedStructure) {
    structure.survey();
    if (
      !Game.rooms[structure.pos.roomName] ||
      (structure.energyToBuild === 0 && structure.energyToRepair <= repairThreshold(structure))
    )
      return; // only register if we can confirm work to be done
    if (!structure.structureId) {
      this.build.add(structure);
    } else {
      switch (structure.structureType) {
        case STRUCTURE_WALL:
        case STRUCTURE_RAMPART:
          this.maintain_barriers.add(structure);
          break;
        case STRUCTURE_ROAD:
        case STRUCTURE_CONTAINER:
        case STRUCTURE_LINK:
        case STRUCTURE_SPAWN:
        case STRUCTURE_EXTENSION:
          this.maintain_economy.add(structure);
          break;
        default:
          this.maintain_other.add(structure);
      }
    }
  }

  allWorkQueue = memoizeOncePerTick(() => [
    ...[...this.build].filter(s => s.canBuild()),
    ...this.maintain_economy,
    ...this.maintain_barriers,
    ...this.maintain_other
  ]);

  workQueue = memoizeOncePerTick(() => {
    const build = [...this.build].filter(
      // if room is owned or reserved by someone else, we can't place a construction site
      s => s.canBuild()
    );
    if (build.length) return build;
    const threatLevel = Memory.rooms[this.office].threatLevel?.[1] ?? 0;
    if (threatLevel) {
      // wartime priority
      if (this.maintain_barriers.size) return [...this.maintain_barriers];
      if (this.maintain_economy.size) return [...this.maintain_economy];
    } else {
      // peacetime priority
      if (this.maintain_economy.size) return [...this.maintain_economy];
      if (this.maintain_barriers.size) return [...this.maintain_barriers];
    }
    return [...this.maintain_other];
  });

  analysis = memoizeOncePerTick(() => {
    const data = {
      energyRemaining: 0,
      workTicksRemaining: 0,
      averageRange: 0,
      minRange: Infinity,
      count: 0
    };
    let storagePos = roomPlans(this.office)?.headquarters?.storage.pos ?? new RoomPosition(25, 25, this.office);
    let range = 0;
    this.allWorkQueue().forEach(s => {
      data.count += 1;
      data.energyRemaining += s.energyToBuild + s.energyToRepair;
      data.workTicksRemaining += s.energyToBuild / BUILD_POWER + s.energyToRepair / (REPAIR_COST * REPAIR_POWER);
      data.minRange = Math.min(data.minRange, getRangeTo(storagePos, s.pos));
      range += getRangeTo(storagePos, s.pos);
    });
    if (data.count) data.averageRange = range / data.count;
    return data;
  });

  complete(structure: PlannedStructure) {
    this.workQueue().splice(this.workQueue().indexOf(structure), 1);
    this.build.delete(structure);
    this.maintain_barriers.delete(structure);
    this.maintain_economy.delete(structure);
    this.maintain_other.delete(structure);
    schedule(() => this.surveyStructure(structure), 1);
  }
}
