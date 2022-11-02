import { RoomPlan } from 'RoomPlanner';
import { plannedOfficeStructuresByRcl } from 'Selectors/plannedStructuresByRcl';
import { sourceIds } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';
import { viz } from 'Selectors/viz';
import { scoreAcquireTarget } from 'Strategy/Acquire/scoreAcquireTarget';

export default (visualizeRoom?: string) => {
  for (let room in Memory.roomPlans) {
    if (visualizeRoom === room) {
      plannedOfficeStructuresByRcl(room, 8)
        .sort(
          (a, b) => (a.structureType === STRUCTURE_RAMPART ? -1 : 0) - (b.structureType === STRUCTURE_RAMPART ? -1 : 0)
        )
        .forEach(s => {
          s.visualize();
        });
      viz(room).connectRoads();

      roomPlans(room)?.fastfiller?.extensions.forEach((s, i) => {
        viz(room).text(i.toFixed(0), s.pos.x, s.pos.y + 0.2);
      });
    }

    const franchise1pos = roomPlans(room)?.franchise1?.container.pos;
    if (franchise1pos) viz(room).text('Franchise1', franchise1pos.x, franchise1pos.y);
    const franchise2pos = roomPlans(room)?.franchise2?.container.pos;
    if (franchise2pos) viz(room).text('Franchise2', franchise2pos.x, franchise2pos.y);

    if (sourceIds(room).length !== 2) continue; // skip rooms with only one source

    const fill = Memory.roomPlans[room].office
      ? '#00aa00'
      : Memory.roomPlans[room].headquarters
      ? '#aaaa00'
      : '#333333';

    Game.map.visual.rect(new RoomPosition(1, 1, room), 48, 48, { fill, stroke: 'transparent', opacity: 0.3 });

    [
      'fastfiller',
      'headquarters',
      'franchise1',
      'franchise2',
      'mine',
      'library',
      'labs',
      'extensions',
      'perimeter',
      'backfill'
    ].forEach((plan, index) => {
      if (Memory.roomPlans[room][plan as keyof RoomPlan] === undefined) return;
      Game.map.visual.text(
        `${plan}: ${Memory.roomPlans[room][plan as keyof RoomPlan] !== null ? '✓' : '✗'}`,
        new RoomPosition(2, 4 * index + 4, room),
        { fontSize: 3, align: 'left' }
      );
    });

    Game.map.visual.text((scoreAcquireTarget(room) * 100).toFixed(0), new RoomPosition(35, 25, room), { fontSize: 5 });
  }
};
