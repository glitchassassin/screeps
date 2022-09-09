import { Dashboard, Rectangle, Table } from 'screeps-viz';

export default () => {
  for (const room in Memory.offices ?? []) {
    let table = [];
    for (let s of Memory.offices[room].spawnQueue) {
      table.push([s.data.name, s.priority, s.duration, s.spawn?.spawn ?? '---']);
    }
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 40,
          height: 2 + Math.min(48, table.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Minion', 'Priority', 'Duration', 'Preferred Spawn'] },
              data: table
            })
          })
        }
      ],
      config: { room }
    });
  }
};
