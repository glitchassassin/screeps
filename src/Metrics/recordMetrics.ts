import { LogisticsMission } from 'Missions/Implementations/LogisticsMission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { Metrics } from 'screeps-viz';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchiseIncome } from 'Selectors/Franchises/franchiseIncome';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { getActualEnergyAvailable } from 'Selectors/getActualEnergyAvailable';
import { sum } from 'Selectors/reducers';
import { getSpawns, roomPlans } from 'Selectors/roomPlans';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
import profiler from 'utils/profiler';
import { heapMetrics } from './heapMetrics';

declare global {
  interface Memory {
    stats: {
      gclMilestones?: Record<number, number>;
      gcl: {
        progress: number;
        progressTotal: number;
        level: number;
      };
      cpu: {
        bucket: number;
        limit: number;
        used: number;
        heap: number;
      };
      offices: {
        [id: string]: {
          controllerProgress: number;
          controllerProgressTotal: number;
          controllerLevel: number;
          libraryEnergyAvailable: number;
          energyAvailable: number;
          energyCapacityAvailable: number;
          spawnUptime: number;
          logisticsCapacity: number;
          logisticsUsedCapacity: number;
          franchiseIncome: number;
          franchiseEnergy: number;
          storageLevel: number;
          terminalLevel: number;
          missions: Record<string, { cpu: number; energy: number }>;
        };
      };
      profiling: Record<string, number>;
      time: number;
      creepCount: number;
      officeCount: number;
    };
  }
}

export const recordMetrics = profiler.registerFN(() => {
  let heapStats = Game.cpu.getHeapStatistics?.();
  let stats = {
    time: Game.time,
    gcl: {
      progress: Game.gcl.progress,
      progressTotal: Game.gcl.progressTotal,
      level: Game.gcl.level
    },
    cpu: {
      bucket: Game.cpu.bucket,
      limit: Game.cpu.limit,
      used: Game.cpu.getUsed(),
      heap: heapStats
        ? (heapStats.total_heap_size + heapStats.externally_allocated_size) / heapStats.heap_size_limit
        : 0
    },
    creepCount: Object.keys(Game.creeps).length,
    officeCount: Object.keys(Memory.offices).length
  };

  // Initialize, if necessary
  Memory.stats ??= {
    ...stats,
    profiling: {},
    gclMilestones: {},
    offices: {}
  };
  Memory.stats = {
    ...Memory.stats,
    ...stats
  };
  Memory.stats.gclMilestones ??= {};
  Memory.stats.gclMilestones[Game.gcl.level] ??= Game.time;

  for (let office in Memory.offices) {
    heapMetrics[office] ??= {
      roomEnergy: Metrics.newTimeseries(),
      buildEfficiency: Metrics.newTimeseries(),
      storageLevel: Metrics.newTimeseries(),
      spawnEfficiency: Metrics.newTimeseries()
    };
    Metrics.update(heapMetrics[office].roomEnergy, getActualEnergyAvailable(office), 300);
    Metrics.update(heapMetrics[office].storageLevel, storageEnergyAvailable(office), 100);
    const spawns = getSpawns(office);
    const spawnEfficiency = spawns.length ? spawns.filter(s => s.spawning).length / spawns.length : 0;
    Metrics.update(heapMetrics[office].spawnEfficiency, spawnEfficiency, 100);

    Memory.stats.offices[office] = {
      ...Memory.stats.offices[office],
      controllerProgress: Game.rooms[office].controller?.progress ?? 0,
      controllerProgressTotal: Game.rooms[office].controller?.progressTotal ?? 0,
      controllerLevel: Game.rooms[office].controller?.level ?? 0,
      libraryEnergyAvailable:
        (
          (roomPlans(office)?.library?.link.structure ?? roomPlans(office)?.library?.container.structure) as
            | StructureContainer
            | StructureLink
        )?.store[RESOURCE_ENERGY] ?? 0,
      energyAvailable: Game.rooms[office].energyAvailable,
      energyCapacityAvailable: Game.rooms[office].energyCapacityAvailable,
      spawnUptime: getSpawns(office).filter(s => s.spawning).length,
      storageLevel: storageEnergyAvailable(office),
      franchiseIncome: franchiseIncome(office),
      logisticsCapacity: activeMissions(office)
        .filter(isMission(LogisticsMission))
        .map(m => m.capacity())
        .reduce(sum, 0),
      logisticsUsedCapacity: activeMissions(office)
        .filter(isMission(LogisticsMission))
        .map(m => m.usedCapacity())
        .reduce(sum, 0),
      franchiseEnergy: franchisesByOffice(office)
        .map(({ source }) => franchiseEnergyAvailable(source))
        .reduce(sum, 0),
      terminalLevel: Game.rooms[office].terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,
      missions: activeMissions(office).reduce((sum, mission) => {
        sum[mission.constructor.name] ??= { cpu: 0, energy: 0 };
        sum[mission.constructor.name].cpu = mission.actualCpuPerCreep() - mission.estimatedCpuPerCreep();
        sum[mission.constructor.name].energy += mission.energyUsed();
        return sum;
      }, {} as Record<string, { cpu: number; energy: number }>)
    };
  }
}, 'recordMetrics');
