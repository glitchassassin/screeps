import { missionById } from 'Missions/BaseClasses/MissionImplementation';
import { getBudgetAdjustment } from 'Missions/Budgets';
import { spawnRequests } from 'Missions/Control';
import { activeMissions } from 'Missions/Selectors';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { MissionEnergyAvailable } from 'Selectors/Missions/missionEnergyAvailable';
import { sum } from 'Selectors/reducers';

export default () => {
  for (const room in Memory.offices ?? []) {
    let table = [];
    const data = (spawnRequests.get(room) ?? []).sort((a, b) => b.priority - a.priority);
    const energy =
      MissionEnergyAvailable[room] -
      activeMissions(room)
        .map(m => m.energyRemaining())
        .reduce(sum, 0);
    for (let s of data) {
      const mission = missionById(s.memory.missionId.split('|')[0])?.constructor.name;
      table.push([
        mission,
        s.name,
        s.memory.role,
        s.priority,
        s.budget,
        s.builds.length,
        s.builds
          .map(build => (energy - s.estimate(build).energy - getBudgetAdjustment(s.office, s.budget)).toFixed(0))
          .join('/')
      ]);
    }
    console.log(table.map(r => JSON.stringify(r)).join('\n'))
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 48,
          height: 2 + Math.min(48, table.length * 1.5),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Mission', 'Minion', 'Role', 'Priority', 'Budget', 'Builds', 'Energy'] },
              data: table
            })
          })
        }
      ],
      config: { room }
    });
  }
};
