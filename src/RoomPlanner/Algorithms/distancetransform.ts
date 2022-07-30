import { getCostMatrix } from 'Selectors/Map/Pathing';

/**
 * To fit rectangular stamps
 */
export function distanceTransform(
  room: string,
  visualize = false,
  initialCM = getCostMatrix(room, false, { ignoreStructures: true, terrain: true }),
  rect = {
    x1: 0,
    y1: 0,
    x2: 49,
    y2: 49
  }
) {
  // Use a costMatrix to record distances
  const distanceCM = new PathFinder.CostMatrix();

  for (let x = Math.max(rect.x1 - 1, 0); x <= Math.min(rect.x2 + 1, 49); x += 1) {
    for (let y = Math.max(rect.y1 - 1, 0); y <= Math.min(rect.y2 + 1, 49); y += 1) {
      distanceCM.set(x, y, initialCM.get(x, y) === 255 ? 0 : 255);
    }
  }

  // Loop through the xs and ys inside the bounds

  for (let x = rect.x1; x <= rect.x2; x += 1) {
    for (let y = rect.y1; y <= rect.y2; y += 1) {
      distanceCM.set(
        x,
        y,
        Math.min(
          Math.min(
            distanceCM.get(x, y - 1),
            distanceCM.get(x - 1, y),
            distanceCM.get(x - 1, y - 1),
            distanceCM.get(x + 1, y - 1),
            distanceCM.get(x - 1, y + 1)
          ) + 1,
          distanceCM.get(x, y)
        )
      );
    }
  }

  // Loop through the xs and ys inside the bounds

  for (let x = rect.x2; x >= rect.x1; x -= 1) {
    for (let y = rect.y2; y >= rect.y1; y -= 1) {
      distanceCM.set(
        x,
        y,
        Math.min(
          Math.min(
            distanceCM.get(x, y + 1),
            distanceCM.get(x + 1, y),
            distanceCM.get(x + 1, y + 1),
            distanceCM.get(x + 1, y - 1),
            distanceCM.get(x - 1, y + 1)
          ) + 1,
          distanceCM.get(x, y)
        )
      );
    }
  }

  if (visualize) {
    // Loop through the xs and ys inside the bounds

    for (let x = rect.x1; x <= rect.x2; x += 1) {
      for (let y = rect.y1; y <= rect.y2; y += 1) {
        new RoomVisual(room).rect(x - 0.5, y - 0.5, 1, 1, {
          fill: `hsl(${200}${distanceCM.get(x, y) * 10}, 100%, 60%)`,
          opacity: 0.4
        });
      }
    }
  }

  return distanceCM;
}

/**
 * To fit diamond stamps
 */
export function diamondDistanceTransform(
  room: string,
  visualize = false,
  initialCM = getCostMatrix(room, false, { ignoreStructures: true, terrain: true }),
  rect = {
    x1: 0,
    y1: 0,
    x2: 49,
    y2: 49
  }
) {
  // Use a costMatrix to record distances
  const distanceCM = new PathFinder.CostMatrix();

  for (let x = rect.x1; x <= rect.x2; x += 1) {
    for (let y = rect.y1; y <= rect.y2; y += 1) {
      distanceCM.set(x, y, initialCM.get(x, y) === 255 ? 0 : 255);
    }
  }

  // Loop through the xs and ys inside the bounds

  for (let x = rect.x1; x <= rect.x2; x += 1) {
    for (let y = rect.y1; y <= rect.y2; y += 1) {
      distanceCM.set(
        x,
        y,
        Math.min(Math.min(distanceCM.get(x, y - 1), distanceCM.get(x - 1, y)) + 1, distanceCM.get(x, y))
      );
    }
  }

  // Loop through the xs and ys inside the bounds

  for (let x = rect.x2; x >= rect.x1; x -= 1) {
    for (let y = rect.y2; y >= rect.y1; y -= 1) {
      distanceCM.set(
        x,
        y,
        Math.min(Math.min(distanceCM.get(x, y + 1), distanceCM.get(x + 1, y)) + 1, distanceCM.get(x, y))
      );
    }
  }

  if (visualize) {
    // Loop through the xs and ys inside the bounds

    for (let x = rect.x1; x <= rect.x2; x += 1) {
      for (let y = rect.y1; y <= rect.y2; y += 1) {
        new RoomVisual(room).rect(x - 0.5, y - 0.5, 1, 1, {
          fill: `hsl(${200}${distanceCM.get(x, y) * 10}, 100%, 60%)`,
          opacity: 0.4
        });
      }
    }
  }

  return distanceCM;
}
