import { MissionImplementation } from 'Missions/BaseClasses/MissionImplementation';
import { getBudgetAdjustment } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { activeMissions } from 'Missions/Selectors';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { MissionEnergyAvailable } from 'Selectors/Missions/missionEnergyAvailable';

const buildMissionsTable = (room: string, missions: MissionImplementation[]) => {
  let estimatedCPU = 0;
  let estimatedEnergy = 0;
  let actualCPU = 0;
  let actualEnergy = 0;
  let cpuDelta = 0;
  let creepCount = 0;
  let missionsList = new Map<
    string,
    {
      count: number;
      priority: number;
      type: string;
      status: MissionStatus;
      budget: number;
      actual: {
        cpuOverhead: number;
        energy: number;
        cpuPerCreep: number;
      };
      estimate: {
        cpuRemaining: number;
        cpuOverhead: number;
        energy: number;
        cpuPerCreep: number;
      };
    }
  >();
  for (let mission of missions) {
    const key = `${mission.id}`;
    const entry = missionsList.get(key) ?? {
      count: 0,
      priority: mission.priority,
      status: mission.status,
      type: mission.toString(),
      budget: 0,
      actual: {
        cpuOverhead: 0,
        energy: 0,
        cpuPerCreep: 0
      },
      estimate: {
        cpuRemaining: 0,
        cpuOverhead: 0,
        energy: 0,
        cpuPerCreep: 0
      }
    };
    const { perCreep, overhead } = mission.cpuStats();
    entry.count += mission.creepCount();
    entry.budget = getBudgetAdjustment(room, mission.budget);
    entry.actual.cpuOverhead += overhead;
    entry.actual.energy += mission.energyUsed();
    entry.actual.cpuPerCreep = perCreep;
    entry.estimate.cpuRemaining = mission.cpuRemaining();
    entry.estimate.cpuOverhead += mission.estimatedCpuOverhead();
    entry.estimate.energy += mission.estimatedEnergyRemaining;
    entry.estimate.cpuPerCreep = mission.estimatedCpuPerCreep();
    missionsList.set(key, entry);
  }
  let table = [];
  const sortedMissionsList = [...missionsList.values()].sort((a, b) => b.priority - a.priority);
  for (let o of sortedMissionsList) {
    if (table.length < 19)
      table.push([
        `${o.type} (${o.count})`,
        o.priority.toFixed(2),
        o.status,
        `${o.estimate.cpuRemaining.toFixed(2)}`,
        `${o.estimate.energy.toFixed(0)}`,
        `${o.budget.toFixed(2)}`,
        `${o.actual.cpuOverhead.toFixed(2)}/${o.actual.cpuPerCreep.toFixed(2)}`
      ]);
    estimatedCPU += o.estimate.cpuRemaining;
    estimatedEnergy += o.estimate.energy;
    actualCPU += Math.min(o.estimate.cpuOverhead, o.actual.cpuOverhead);
    actualEnergy += Math.min(o.estimate.energy, o.actual.energy);
    cpuDelta = o.actual.cpuPerCreep - o.estimate.cpuPerCreep;
    creepCount += o.count;
    // if (cpuDelta * o.count > 1) console.log(o.type, cpuDelta.toFixed(2), o.count, (cpuDelta * o.count).toFixed(2));
  }
  table.push(['---', '---', '---', '---', '---', '---', '---']);
  table.push(['Remaining', '', '', `${estimatedCPU.toFixed(2)}`, `${estimatedEnergy.toFixed(0)}`, '', '']);
  table.push([
    'Available',
    '',
    Game.time,
    (missionCpuAvailable(room) - estimatedCPU).toFixed(2),
    MissionEnergyAvailable[room]?.toFixed(0),
    '',
    ''
  ]);
  // console.log(room, cpuDelta, cpuDelta * creepCount);
  return table;
};

export default () => {
  for (const room in Memory.offices ?? []) {
    const active = buildMissionsTable(room, activeMissions(room));
    // console.log(active.map(r => JSON.stringify(r)).join('\n'));
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 47,
          height: Math.min(24, active.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Mission', 'Priority', 'Status', 'CPU', 'Energy', 'Budget', 'Overhead/Per Creep'] },
              data: active
            })
          })
        }
      ],
      config: { room }
    });
  }
};
