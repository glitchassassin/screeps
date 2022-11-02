import { missionById } from 'Missions/BaseClasses/MissionImplementation';
import { getBudgetAdjustment } from 'Missions/Budgets';
import { spawnRequests } from 'Missions/Control';
import { missionsByOffice } from 'Missions/Selectors';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { missionEnergyAvailable } from 'Selectors/missionEnergyAvailable';
import { sum } from 'Selectors/reducers';

export default () => {
  for (const room in Memory.offices ?? []) {
    let table = [];
    const data = (spawnRequests.get(room) ?? []).sort((a, b) => b.priority - a.priority);
    const energy =
      missionEnergyAvailable(room) -
      missionsByOffice()
        [room].map(m => m.energyRemaining())
        .reduce(sum, 0);
    for (let s of data) {
      const mission = missionById(s.memory.missionId.split('|')[0])?.constructor.name;
      table.push([
        mission,
        s.name,
        s.memory.role,
        s.priority,
        s.budget,
        energy - s.estimate.energy - getBudgetAdjustment(s.office, s.budget)
      ]);
    }
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 48,
          height: 2 + Math.min(48, table.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Mission', 'Minion', 'Role', 'Priority', 'Budget', 'Energy'] },
              data: table
            })
          })
        }
      ],
      config: { room }
    });
  }
};
