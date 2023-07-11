import { MissionImplementation } from 'Missions/BaseClasses/MissionImplementation';
import { MissionStatus } from 'Missions/Mission';
import { activeMissions } from 'Missions/Selectors';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
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
      actual: {
        cpuOverhead: number;
        energy: number;
        cpuPerCreep: number;
      };
      estimate: {
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
      actual: {
        cpuOverhead: 0,
        energy: 0,
        cpuPerCreep: 0
      },
      estimate: {
        cpuOverhead: 0,
        energy: 0,
        cpuPerCreep: 0
      }
    };
    const { perCreep, overhead } = mission.cpuStats();
    entry.count += mission.creepCount();
    entry.actual.cpuOverhead += overhead;
    entry.actual.energy += mission.energyUsed();
    entry.actual.cpuPerCreep = perCreep;
    entry.estimate.cpuOverhead += mission.estimatedCpuOverhead();
    entry.estimate.energy += mission.energyRemaining();
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
        `${o.actual.cpuOverhead.toFixed(2)}/${o.estimate.cpuOverhead.toFixed(2)}`,
        `${o.estimate.energy.toFixed(0)}`,
        `${((o.actual.cpuPerCreep - o.estimate.cpuPerCreep) * o.count).toFixed(2)} (${(
          o.actual.cpuPerCreep - o.estimate.cpuPerCreep
        ).toFixed(2)})`
      ]);
    estimatedCPU += o.estimate.cpuOverhead;
    estimatedEnergy += o.estimate.energy;
    actualCPU += Math.min(o.estimate.cpuOverhead, o.actual.cpuOverhead);
    actualEnergy += Math.min(o.estimate.energy, o.actual.energy);
    cpuDelta = o.actual.cpuPerCreep - o.estimate.cpuPerCreep;
    creepCount += o.count;
    // if (cpuDelta * o.count > 1) console.log(o.type, cpuDelta.toFixed(2), o.count, (cpuDelta * o.count).toFixed(2));
  }
  table.push(['---', '---', '---', '---', '---', '---']);
  table.push(['Remaining', '', '', '', `${estimatedEnergy}`, '']);
  table.push(['Available', '', Game.time, '', MissionEnergyAvailable[room], '']);
  table.push(['Accuracy', '', '', '', '', cpuDelta.toFixed(2)]);
  // console.log(room, cpuDelta, cpuDelta * creepCount);
  return table;
};

export default () => {
  for (const room in Memory.offices ?? []) {
    const active = buildMissionsTable(room, activeMissions(room));
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 47,
          height: Math.min(24, active.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Mission', 'Priority', 'Status', 'CPU', 'Energy', 'Actual/Est'] },
              data: active
            })
          })
        }
      ],
      config: { room }
    });
  }
};
