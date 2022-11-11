import { MissionImplementation } from 'Missions/BaseClasses/MissionImplementation';
import { MissionStatus } from 'Missions/Mission';
import { activeMissions } from 'Missions/Selectors';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { missionCpuAvailable } from 'Selectors/missionCpuAvailable';
import { missionEnergyAvailable } from 'Selectors/missionEnergyAvailable';

const buildMissionsTable = (room: string, missions: MissionImplementation[]) => {
  let estimatedCPU = 0;
  let estimatedEnergy = 0;
  let actualCPU = 0;
  let actualEnergy = 0;
  let missionsList = new Map<
    string,
    {
      count: number;
      priority: number;
      type: string;
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
    const key = `${mission.id}`;
    const entry = missionsList.get(key) ?? {
      count: 0,
      priority: mission.priority,
      status: mission.status,
      type: mission.toString(),
      actual: {
        cpu: 0,
        energy: 0
      },
      estimate: {
        cpu: 0,
        energy: 0
      }
    };
    entry.count += mission.creepCount();
    entry.actual.cpu += mission.cpuUsed();
    entry.actual.energy += mission.energyUsed();
    entry.estimate.cpu += mission.cpuRemaining();
    entry.estimate.energy += mission.energyRemaining();
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
        `${o.estimate.cpu.toFixed(2)}`,
        `${o.estimate.energy.toFixed(0)}`
      ]);
    estimatedCPU += o.estimate.cpu;
    estimatedEnergy += o.estimate.energy;
    actualCPU += Math.min(o.estimate.cpu, o.actual.cpu);
    actualEnergy += Math.min(o.estimate.energy, o.actual.energy);
  }
  table.push(['---', '---', '---', '---', '---']);
  table.push(['Remaining', '', '', `${estimatedCPU.toFixed(2)}`, `${estimatedEnergy}`]);
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
          width: 47,
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
