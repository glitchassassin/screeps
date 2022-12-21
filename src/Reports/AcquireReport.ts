import {
  acquireTargetIsValid,
  findAcquireTarget,
  officeShouldClaimAcquireTarget,
  officeShouldSupportAcquireTarget
} from 'Strategy/Acquire/findAcquireTarget';
import { roomThreatLevel } from 'Strategy/Territories/HarassmentZones';

export default () => {
  const target = findAcquireTarget();
  for (let room in Memory.rooms) {
    if (Memory.rooms[room].eligibleForOffice) {
      Game.map.visual.text('Eligible', new RoomPosition(25, 5, room), { fontSize: 3 });
    }
    if (Memory.rooms[room].owner || Memory.rooms[room].reserver) {
      Game.map.visual.text(Memory.rooms[room].owner ?? Memory.rooms[room].reserver!, new RoomPosition(25, 8, room), {
        fontSize: 3
      });
    }
    if (Memory.roomPlans[room]?.office) {
      Game.map.visual.text('Planned', new RoomPosition(25, 14, room), { fontSize: 3 });
    }
    Game.map.visual.text(
      'Min distance: ' +
        Math.min(
          ...Object.keys(Memory.offices)
            .filter(office => office !== room)
            .map(office => Game.map.getRoomLinearDistance(office, room))
        ),
      new RoomPosition(25, 17, room),
      { fontSize: 3 }
    );
    if (acquireTargetIsValid(room)) {
      Game.map.visual.text('Valid Target', new RoomPosition(25, 20, room), { fontSize: 3 });
    }
  }
  if (!target) return;
  Game.map.visual.rect(new RoomPosition(1, 1, target), 48, 48, {
    fill: '#00ff00',
    stroke: 'transparent',
    opacity: 0.5
  });
  Game.map.visual.text('Threat level: ' + roomThreatLevel(target).toFixed(0), new RoomPosition(5, 5, target), {
    fontSize: 4,
    align: 'left'
  });
  for (let room in Memory.offices) {
    if (officeShouldClaimAcquireTarget(room)) {
      Game.map.visual.line(new RoomPosition(25, 25, target), new RoomPosition(25, 25, room), {
        color: '#00ff00',
        width: 1,
        lineStyle: 'solid',
        opacity: 0.5
      });
    } else if (officeShouldSupportAcquireTarget(room)) {
      Game.map.visual.line(new RoomPosition(25, 25, target), new RoomPosition(25, 25, room), {
        color: '#00ff00',
        width: 1,
        lineStyle: 'dashed',
        opacity: 0.5
      });
    }
  }
};
