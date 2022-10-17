import { Mission, MissionStatus, MissionType } from 'Missions/Mission';
import { activeMissions } from 'Missions/Selectors';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { missionEnergyAvailable } from 'Selectors/missionEnergyAvailable';

const buildMissionsTable = (room: string, missions: Mission<MissionType>[]) => {
  let estimatedCPU = 0;
  let estimatedEnergy = 0;
  let actualCPU = 0;
  let actualEnergy = 0;
  let missionsList = new Map<
    string,
    {
      count: number;
      priority: number;
      type: MissionType;
      status: MissionStatus;
      actual: {
        cpu: number;
        energy: number;
      };
      estimate: {
        cpu: number;
        energy: number;
      };
    }
  >();
  for (let mission of missions) {
    const key = `${mission.priority}_${mission.type}_${mission.status}`;
    const entry = missionsList.get(key) ?? {
      count: 0,
      priority: mission.priority,
      status: mission.status,
      type: mission.type,
      actual: {
        cpu: 0,
        energy: 0
      },
      estimate: {
        cpu: 0,
        energy: 0
      }
    };
    entry.count += 1;
    entry.actual.cpu += mission.actual.cpu;
    entry.actual.energy += mission.actual.energy;
    entry.estimate.cpu += mission.estimate.cpu;
    entry.estimate.energy += mission.estimate.energy;
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
        `${o.actual.cpu.toFixed(2)}/${o.estimate.cpu.toFixed(2)}`,
        `${o.actual.energy}/${o.estimate.energy}`
      ]);
    estimatedCPU += o.estimate.cpu;
    estimatedEnergy += o.estimate.energy;
    actualCPU += Math.min(o.estimate.cpu, o.actual.cpu);
    actualEnergy += Math.min(o.estimate.energy, o.actual.energy);
  }
  table.push(['---', '---', '---', '---', '---']);
  table.push(['Remaining', '', '', `${(estimatedCPU - actualCPU).toFixed(2)}`, `${estimatedEnergy - actualEnergy}`]);
  table.push(['Available', '', Game.time, missionCpuAvailable(room).toFixed(2), missionEnergyAvailable(room)]);
  return table;
};

export default () => {
  for (const room in Memory.offices ?? []) {
    const active = buildMissionsTable(room, activeMissions(room));
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 40,
          height: Math.min(24, active.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Mission', 'Priority', 'Status', 'CPU', 'Energy'] },
              data: active
            })
          })
        }
      ],
      config: { room }
    });
  }
};
