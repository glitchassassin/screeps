import { activeSquadMissions } from 'Missions/Selectors';
import { SquadMission, SquadMissionType } from 'Missions/Squads';
import { Dashboard, Rectangle, Table } from 'screeps-viz';

const buildMissionsTable = (room: string, missions: SquadMission<SquadMissionType, any>[]) => {
  let table = [];
  for (let mission of missions.slice().sort((a, b) => b.priority - a.priority)) {
    table.push([`[${mission.type} ${mission.id}]`, mission.priority.toFixed(2), mission.status]);
  }
  return table;
};

export default () => {
  for (const room in Memory.offices ?? []) {
    const active = buildMissionsTable(room, activeSquadMissions(room));
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 40,
          height: Math.max(1.5, Math.min(24, active.length * 1.5)),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Mission', 'Priority', 'Status'] },
              data: active
            })
          })
        }
      ],
      config: { room }
    });
  }
};
