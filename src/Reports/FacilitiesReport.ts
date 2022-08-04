import { BARRIER_LEVEL, BARRIER_TYPES } from 'config';
import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { Dashboard, Rectangle, Table } from 'screeps-viz';
import { franchisesThatNeedRoadWork } from 'Selectors/plannedTerritoryRoads';
import { facilitiesCostPending, facilitiesWorkToDo } from 'Selectors/Structures/facilitiesWorkToDo';
import { viz } from 'Selectors/viz';

export default () => {
  for (let room in Memory.offices) {
    const visited = new Map<PlannedStructure, boolean>();
    const structureTypes: StructureConstant[] = [];
    const workToDo = facilitiesWorkToDo(room).sort(
      (a, b) => (a.structureType === STRUCTURE_RAMPART ? -1 : 0) - (b.structureType === STRUCTURE_RAMPART ? -1 : 0)
    );
    workToDo.forEach(s => {
      if (visited.get(s)) console.log('Duplicate planned structure', s.pos);
      visited.set(s, true);
      if (!structureTypes.includes(s.structureType)) structureTypes.push(s.structureType);
      if (!s.structure) {
        s.visualize();
      } else {
        viz(s.pos.roomName).rect(s.pos.x - 1, s.pos.y - 1, 2, 2, {
          stroke: 'yellow',
          fill: 'transparent',
          lineStyle: 'dashed'
        });
        const rcl = Game.rooms[s.pos.roomName]?.controller?.level ?? 0;
        const maxHits = BARRIER_TYPES.includes(s.structureType) ? BARRIER_LEVEL[rcl] : s.structure.hitsMax;
        viz(s.pos.roomName).text(`${((100 * s.structure.hits) / maxHits).toFixed(1)}%`, s.pos.x, s.pos.y);
      }
    });

    const data = [
      ...structureTypes.map(t => ['', '', t]),
      ['---', '---', '---'],
      [workToDo.length, facilitiesCostPending(room), '']
    ];

    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: 1 },
          width: 40,
          height: Math.min(48, 1 + data.length * 1.4),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Count', 'Cost', 'Types'] },
              data
            })
          })
        }
      ],
      config: { room }
    });

    // Remote roads
    const remotes = franchisesThatNeedRoadWork(room).map(source => [
      source,
      activeMissions(room)
        .filter(isMission(MissionType.ENGINEER))
        .filter(m => m.data.franchise === source).length
    ]);
    Dashboard({
      widgets: [
        {
          pos: { x: 1, y: Math.min(48, 1 + data.length * 1.4) + 2 },
          width: 40,
          height: Math.max(4, Math.min(48, 1 + remotes.length * 1.4)),
          widget: Rectangle({
            data: Table({
              config: { headers: ['Franchise', 'Assigned'] },
              data: remotes
            })
          })
        }
      ],
      config: { room }
    });
  }
};
