import { missionById } from 'Missions/BaseClasses/MissionImplementation';
import { spawnRequests } from 'Missions/Control';
import { Dashboard, Rectangle, Table } from 'screeps-viz';

export default () => {
  for (const room in Memory.offices ?? []) {
    let table = [];
    const data = (spawnRequests.get(room) ?? []).sort((a, b) => b.priority - a.priority);
    for (let s of data) {
      const mission = missionById(s.memory.missionId.split('|')[0])?.constructor.name;
      table.push([mission, s.name, s.memory.role, s.priority]);
    }
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 40,
          height: 2 + Math.min(48, table.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Mission', 'Minion', 'Role', 'Priority'] },
              data: table
            })
          })
        }
      ],
      config: { room }
    });
  }
};
