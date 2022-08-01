import { flowfields } from 'RoomPlanner/Algorithms/flowfield';
import { controllerPosition, mineralPosition, roomExits, sourcePositions } from 'Selectors/roomCache';
import { memoize } from 'utils/memoizeFunction';

const avoidBorders = () => {
  const borders = [0, 1, 48, 49];
  const cm = new PathFinder.CostMatrix();
  for (const x of borders) {
    for (let y = 0; y < 50; y++) {
      cm.set(x, y, 255);
    }
  }
  for (const y of borders) {
    for (let x = 2; x < 48; x++) {
      cm.set(x, y, 255);
    }
  }
  return cm;
};

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

    const borders = avoidBorders();

    // paths to exits can ignore the border restriction; no other paths should
    // be closer than 2 squares to the border
    return {
      ...flowfields(
        room,
        {
          controller: [controller],
          source1: [source1],
          source2: [source2],
          mineral: [mineral]
        },
        borders
      ),
      ...flowfields(room, {
        exits
      })
    };
  }
);
