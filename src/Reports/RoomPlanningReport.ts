import { RoomPlan } from 'RoomPlanner';
import { plannedOfficeStructuresByRcl } from 'Selectors/plannedStructuresByRcl';
import { roomPlans } from 'Selectors/roomPlans';

export default () => {
  for (let room in Memory.roomPlans) {
    plannedOfficeStructuresByRcl(room, 8)
      .sort(
        (a, b) => (a.structureType === STRUCTURE_RAMPART ? -1 : 0) - (b.structureType === STRUCTURE_RAMPART ? -1 : 0)
      )
      .forEach(s => {
        s.visualize();
      });

    const route = roomPlans(room)?.extensions?.extensions.map(e => e.pos) ?? [];
    new RoomVisual(room).poly(route, { stroke: 'magenta', fill: 'transparent' });

    const franchise1pos = roomPlans(room)?.franchise1?.container.pos;
    if (franchise1pos) new RoomVisual(room).text('Franchise1', franchise1pos.x, franchise1pos.y);
    const franchise2pos = roomPlans(room)?.franchise2?.container.pos;
    if (franchise2pos) new RoomVisual(room).text('Franchise2', franchise2pos.x, franchise2pos.y);

    const fill = Memory.roomPlans[room].office
      ? '#00aa00'
      : Memory.roomPlans[room].headquarters
      ? '#aaaa00'
      : '#333333';

    Game.map.visual.rect(new RoomPosition(1, 1, room), 48, 48, { fill, stroke: 'transparent', opacity: 0.3 });

    ['headquarters', 'franchise1', 'franchise2', 'mine', 'labs', 'extensions', 'perimeter', 'fastfiller'].forEach(
      (plan, index) => {
        if (Memory.roomPlans[room][plan as keyof RoomPlan] === undefined) return;
        Game.map.visual.text(
          `${plan}: ${Memory.roomPlans[room][plan as keyof RoomPlan] !== null ? '✓' : '✗'}`,
          new RoomPosition(2, 5 * index + 4, room),
          { fontSize: 4, align: 'left' }
        );
      }
    );
  }
};
