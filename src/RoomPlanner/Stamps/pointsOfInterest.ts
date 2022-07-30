import { flowfields } from 'RoomPlanner/Algorithms/flowfield';
import { controllerPosition, mineralPosition, roomExits, sourcePositions } from 'Selectors/roomCache';
import { memoize } from 'utils/memoizeFunction';

export const pointsOfInterest = memoize(
  room => room,
  (room: string) => {
    const controller = controllerPosition(room);
    const [source1, source2] = sourcePositions(room);
    const mineral = mineralPosition(room);
    const exits = roomExits(room);
    if (!controller || !source1 || !source2 || !mineral || !exits) {
      console.log(
        'controller',
        !controller,
        'source1',
        !source1,
        'source2',
        !source2,
        'mineral',
        !mineral,
        'exits',
        !exits
      );
      throw new Error('Unable to generate flowfields for room');
    }
    return flowfields(room, {
      controller: [controller],
      source1: [source1],
      source2: [source2],
      mineral: [mineral],
      exits
    });
  }
);
