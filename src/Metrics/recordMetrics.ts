import { getActualEnergyAvailable } from 'Selectors/getActualEnergyAvailable';
import { getSpawns } from 'Selectors/roomPlans';
import { Metrics } from 'screeps-viz';
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

export const recordMetrics = () => {
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
      spawnEfficiency: Metrics.newTimeseries()
    };
    Metrics.update(heapMetrics[office].roomEnergy, getActualEnergyAvailable(office), 300);
    const spawns = getSpawns(office);
    const spawnEfficiency = spawns.length ? spawns.filter(s => s.spawning).length / spawns.length : 0;
    Metrics.update(heapMetrics[office].spawnEfficiency, spawnEfficiency, 100);

    // mission statistics
    // const { franchiseIncome, logisticsCapacity, logisticsUsedCapacity, missionStats } = activeMissions(office)
    //   .reduce(
    //     (sum, mission) => {
    //       if (isMission(LogisticsMission)(mission)) {
    //         sum.logisticsCapacity += mission.capacity();
    //         sum.logisticsUsedCapacity += mission.usedCapacity();
    //       } else if (isMission(HarvestMission)(mission)) {
    //         sum.franchiseIncome += mission.harvestRate();
    //       }

    //       sum.missionStats[mission.constructor.name] ??= { cpu: 0, energy: 0 };
    //       sum.missionStats[mission.constructor.name].cpu = mission.actualCpuPerCreep() - mission.estimatedCpuPerCreep();
    //       sum.missionStats[mission.constructor.name].energy += mission.energyUsed();

    //       return sum;
    //     },
    //     {
    //       franchiseIncome: 0,
    //       logisticsCapacity: 0,
    //       logisticsUsedCapacity: 0,
    //       missionStats: {} as Record<string, { cpu: number; energy: number }>
    //     }
    //   )

    // Memory.stats.offices[office] = {
    //   ...Memory.stats.offices[office],
    //   controllerProgress: Game.rooms[office].controller?.progress ?? 0,
    //   controllerProgressTotal: Game.rooms[office].controller?.progressTotal ?? 0,
    //   controllerLevel: Game.rooms[office].controller?.level ?? 0,
    //   libraryEnergyAvailable:
    //     (
    //       (roomPlans(office)?.library?.link.structure ?? roomPlans(office)?.library?.container.structure) as
    //         | StructureContainer
    //         | StructureLink
    //     )?.store[RESOURCE_ENERGY] ?? 0,
    //   energyAvailable: Game.rooms[office].energyAvailable,
    //   energyCapacityAvailable: Game.rooms[office].energyCapacityAvailable,
    //   spawnUptime: getSpawns(office).filter(s => s.spawning).length,
    //   storageLevel: storageEnergyAvailable(office),
    //   franchiseIncome,
    //   logisticsCapacity,
    //   logisticsUsedCapacity,
    //   franchiseEnergy: franchisesByOffice(office)
    //     .map(({ source }) => franchiseEnergyAvailable(source))
    //     .reduce(sum, 0),
    //   terminalLevel: Game.rooms[office].terminal?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0,
    //   missions: missionStats
    // };
  }
};
