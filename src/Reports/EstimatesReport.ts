import { MISSION_HISTORY_LIMIT } from 'config';
import { MissionType } from 'Missions/Mission';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { missionEnergyAvailable } from 'Selectors/missionEnergyAvailable';

const missionsStatsTable = (room: string) => {
  const missionStats: Partial<
    Record<
      MissionType,
      {
        cpu: { min: number; max: number; avg: number; sum: number };
        energy: { min: number; max: number; avg: number; sum: number };
        efficiency: { min: number; max: number; avg: number; sum: number };
        totals: { cpu: number; energy: number };
      }
    >
  > = {};
  let totalEnergy = 0;
  for (const type in Memory.offices[room].missionResults) {
    if (!Memory.offices[room].missionResults[type as MissionType]?.length) continue;
    const stats = {
      cpu: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
      energy: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
      efficiency: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
      totals: { cpu: 0, energy: 0 }
    };
    for (const result of Memory.offices[room].missionResults[type as MissionType]!) {
      const cpu = ((result.estimate.cpu - result.actual.cpu) / result.estimate.cpu) * 100;
      const energy = result.actual.energy;
      const efficiency = isNaN(result.efficiency) ? 0 : result.efficiency;
      stats.cpu.min = Math.min(stats.cpu.min, cpu);
      stats.energy.min = Math.min(stats.energy.min, energy);
      stats.efficiency.min = Math.min(stats.efficiency.min, efficiency);
      stats.cpu.max = Math.max(stats.cpu.max, cpu);
      stats.energy.max = Math.max(stats.energy.max, energy);
      stats.efficiency.max = Math.max(stats.efficiency.max, efficiency);
      stats.cpu.sum += cpu;
      stats.energy.sum += energy;
      stats.efficiency.sum += efficiency;
      stats.totals.cpu += result.actual.cpu;
      stats.totals.energy += result.actual.energy;
    }
    stats.cpu.avg = stats.cpu.sum / Memory.offices[room].missionResults[type as MissionType]!.length;
    stats.energy.avg = stats.energy.sum / Memory.offices[room].missionResults[type as MissionType]!.length;
    stats.efficiency.avg =
      (stats.efficiency.sum * 100) / Memory.offices[room].missionResults[type as MissionType]!.length;
    totalEnergy += stats.totals.energy;
    missionStats[type as MissionType] = stats;
  }
  let table = [];
  for (let type in missionStats) {
    table.push([
      type,
      `${missionStats[type as MissionType]?.cpu.min.toFixed(2) ?? '--'}% / ${
        missionStats[type as MissionType]?.cpu.avg.toFixed(2) ?? '--'
      }% / ${missionStats[type as MissionType]?.cpu.max.toFixed(2) ?? '--'}%`,
      `${missionStats[type as MissionType]?.energy.min.toFixed(0) ?? '--'} / ${
        missionStats[type as MissionType]?.energy.avg.toFixed(0) ?? '--'
      } / ${missionStats[type as MissionType]?.energy.max.toFixed(0) ?? '--'}`,
      `${missionStats[type as MissionType]?.efficiency.avg.toFixed(2) ?? '--'}%`,
      `${(((missionStats[type as MissionType]?.totals.energy ?? 0) * 100) / totalEnergy).toFixed(2)}%`
    ]);
  }
  table.push(['--', '--', '--', '--', '--']);
  table.push([
    'Available',
    missionCpuAvailable(room).toFixed(2),
    missionEnergyAvailable(room),
    '',
    `${totalEnergy} (${(totalEnergy / MISSION_HISTORY_LIMIT).toFixed(0)}/t)`
  ]);
  return table;
};

export default () => {
  for (const room in Memory.offices ?? []) {
    const missionsStats = missionsStatsTable(room);
    const missionsStatsHeight = Math.min(24, missionsStats.length * 1.5);
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 47,
          height: missionsStatsHeight,
          widget: Rectangle({
            data: Table({
              config: {
                headers: [
                  'Mission',
                  'Surplus CPU (min/avg/max)',
                  'Energy Used (min/avg/max)',
                  'Efficiency',
                  'Total Energy'
                ]
              },
              data: missionsStats
            })
          })
        }
      ],
      config: { room }
    });
  }
};
