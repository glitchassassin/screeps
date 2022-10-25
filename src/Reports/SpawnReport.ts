import { spawnRequests } from 'Missions/Control';
import { Dashboard, Rectangle, Table } from 'screeps-viz';

export default () => {
  for (const room in Memory.offices ?? []) {
    let table = [];
    const data = (spawnRequests.get(room) ?? []).sort((a, b) => b.priority - a.priority);
    for (let s of data) {
      table.push([s.name, s.priority, s.memory.missionId, s.spawn ?? '---']);
    }
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 40,
          height: 2 + Math.min(48, table.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Minion', 'Priority', 'Mission', 'Preferred Spawn'] },
              data: table
            })
          })
        }
      ],
      config: { room }
    });
  }
};
