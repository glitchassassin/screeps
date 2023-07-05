import { MISSION_HISTORY_LIMIT } from 'config';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { MissionEnergyAvailable } from 'Selectors/Missions/missionEnergyAvailable';

const missionsStatsTable = (room: string) => {
  const missionStats: Record<
    string,
    {
      cpu: { min: number; max: number; avg: number; sum: number };
      energy: { min: number; max: number; avg: number; sum: number };
      totals: { cpu: number; energy: number };
      count: number;
    }
  > = {};
  let totalEnergy = 0;
  for (const report of Memory.missionReports.filter(r => r.office === room)) {
    const stats = missionStats[report.type] ?? {
      cpu: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
      energy: { min: Infinity, max: -Infinity, avg: 0, sum: 0 },
      totals: { cpu: 0, energy: 0 },
      count: 0
    };
    missionStats[report.type] = stats;
    stats.cpu.min = Math.min(stats.cpu.min, report.cpuUsed);
    stats.energy.min = Math.min(stats.energy.min, report.energyUsed);
    stats.cpu.max = Math.max(stats.cpu.max, report.cpuUsed);
    stats.energy.max = Math.max(stats.energy.max, report.energyUsed);
    stats.cpu.sum += report.cpuUsed;
    stats.energy.sum += report.energyUsed;
    stats.totals.cpu += report.cpuUsed;
    stats.totals.energy += report.energyUsed;
    stats.count += 1;
    totalEnergy += report.energyUsed;
  }
  for (const reportType in missionStats) {
    const stats = missionStats[reportType];
    stats.cpu.avg = stats.cpu.sum / stats.count;
    stats.energy.avg = stats.energy.sum / stats.count;
  }
  let table = [];
  for (let type in missionStats) {
    table.push([
      type,
      `${missionStats[type].cpu.min.toFixed(2) ?? '--'}% / ${missionStats[type].cpu.avg.toFixed(2) ?? '--'}% / ${
        missionStats[type].cpu.max.toFixed(2) ?? '--'
      }%`,
      `${missionStats[type].energy.min.toFixed(0) ?? '--'} / ${missionStats[type].energy.avg.toFixed(0) ?? '--'} / ${
        missionStats[type].energy.max.toFixed(0) ?? '--'
      }`,
      `${(((missionStats[type].totals.energy ?? 0) * 100) / totalEnergy).toFixed(2)}%`
    ]);
  }
  table.push(['--', '--', '--', '--']);
  table.push([
    'Available',
    missionCpuAvailable(room).toFixed(2),
    MissionEnergyAvailable[room],
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
