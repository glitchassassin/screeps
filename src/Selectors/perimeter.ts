import { memoize } from "utils/memoizeFunction";
import { calculateNearbyPositions, getRangeTo } from "./Map/MapCoordinates";
import { controllerPosition } from "./roomCache";
import { roomPlans } from "./roomPlans";

/**
 * Returns a list of all RoomPositions inside the rampart perimeter
 */
export const insidePerimeter = memoize(
  office => `${office}${!!roomPlans(office)?.perimeter}`,
  (office: string) => {
    const ramparts = roomPlans(office)?.perimeter?.ramparts;
    const startingPos = controllerPosition(office);
    if (!Game.rooms[office] || !ramparts || !startingPos) return [];

    // Flood fill from startingPos
    const terrain = Game.map.getRoomTerrain(office);
    let inside: RoomPosition[] = [];
    let unvisited = calculateNearbyPositions(startingPos, 1, false);
    let visited: Record<string, boolean> = {};
    while (unvisited.length) {
      const next = unvisited.shift();
      if (!next) break;
      if (visited[`${next}`]) continue;

      visited[`${next}`] = true;

      if (terrain.get(next.x, next.y) === TERRAIN_MASK_WALL) {
        continue; // walls are not inside, but visited
      }

      // rampart or inside square
      inside.push(next);

      if (next.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_RAMPART)) {
        continue; // rampart; don't look for neighbors
      }

      unvisited.push(...calculateNearbyPositions(next, 1, false).filter(p => !(`${p}` in visited)));
    }

    return inside;
  }
)

/**
 * Any positions not inside the perimeter, and not walls, are outside
 */
export const outsidePerimeter = memoize(
  office => `${office}${!!roomPlans(office)?.perimeter}`,
  (office: string) => {
    const inside = insidePerimeter(office).reduce((index, pos) => {
      index[`${pos}`] = true;
      return index;
    }, <Record<string, boolean>>{})

    const outside: RoomPosition[] = [];
    const terrain = Game.map.getRoomTerrain(office);

    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;
        const pos = new RoomPosition(x, y, office);
        if (`${pos}` in inside) continue;
        outside.push(pos);
      }
    }

    return outside;
  }
)

export const rampartSections = memoize(
  office => office + roomPlans(office)?.perimeter?.ramparts?.length,
  (office: string) => {
    const ramparts = roomPlans(office)?.perimeter?.ramparts;
    if (!ramparts?.length) return [];

    let groups: RoomPosition[][] = []
    ramparts.forEach(rampart => {
      const existingGroups = groups.filter(g => g.some(c => rampart.pos.getRangeTo(c) <= 1));
      if (existingGroups.length > 1) {
        // Creep merges multiple existing groups
        groups = groups.filter(g => !existingGroups.includes(g));
        groups.push(existingGroups.flat().concat(rampart.pos));
      } else {
        if (existingGroups[0]) {
          existingGroups[0].push(rampart.pos);
        } else {
          groups.push([rampart.pos]);
        }
      }
    });

    return groups;
  }
)

export const closestRampartSection = (pos: RoomPosition) => {
  const sections = rampartSections(pos.roomName);
  let closest: RoomPosition[]|undefined = undefined;
  let closestDistance = Infinity;
  for (const section of sections) {
    for (const sectionPos of section) {
      const distance = getRangeTo(pos, sectionPos);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = section;
      }
    }
  }
  return closest;
}
