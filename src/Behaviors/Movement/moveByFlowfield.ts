import { terrainCostAt } from "Selectors/Map/MapCoordinates";
import { getCostMatrix } from "Selectors/Map/Pathing";
import { viz } from "Selectors/viz";
import { calculateNearbyPositions, move, moveTo } from "screeps-cartographer";
import { memoize, memoizeByTick } from "utils/memoizeFunction";
import { packPosList } from "utils/packrat";
import { visualizeCostMatrix } from "utils/visualizeCostMatrix";

const generateFlowfield = memoize(
  (room: string, source: RoomPosition[]) =>
    `${room}_${packPosList(source)}`,
  (room: string, source: RoomPosition[]) => {
    const frontier = source.slice();
    const terrain = Game.map.getRoomTerrain(room);
    const structures = getCostMatrix(room, false, { roomPlan: true, })
    const cm = new PathFinder.CostMatrix();

    while (frontier.length) {
      const current = frontier.shift()!;
      for (const next of calculateNearbyPositions(current, 1)) {
        if (
          terrain.get(next.x, next.y) === TERRAIN_MASK_WALL ||
          structures.get(next.x, next.y) >= 0xfe ||
          source.some(s => s.isEqualTo(next))
        ) {
          continue;
        }

        let nextCost = cm.get(current.x, current.y)
        const structureCost = structures.get(next.x, next.y);
        if (structureCost !== 0) {
          nextCost += structureCost; // allow for roads or other customizations
        } else {
          nextCost += terrainCostAt(next) * 2;
        }

        if (cm.get(next.x, next.y) === 0 || cm.get(next.x, next.y) > nextCost) {
          frontier.push(next);
          cm.set(next.x, next.y, nextCost);
        }
      }
    }

    return cm;
  }
);

const debug = memoizeByTick(o => o, (o: string, cm: PathFinder["CostMatrix"]) => visualizeCostMatrix(cm, o))

export const moveByFlowfield = (creep: Creep, target: RoomPosition) => {
  if (creep.pos.roomName !== target.roomName) {
    moveTo(creep, target);
    return;
  }
  if (creep.pos.inRangeTo(target, 1)) {
    const positions = [creep.pos, ...calculateNearbyPositions(creep.pos, 1).filter(p => p.getRangeTo(target) === 1)];
    positions.forEach(p => viz(creep.room.name).line(creep.pos, p, { color: "red" }));
    move(creep, positions);
    return;
  }
  const flowfield = generateFlowfield(creep.room.name, [target]);

  // debug(creep.room.name, flowfield)

  // find cheapest adjacent square to move to
  // TODO: Handle getting stuck
  const adjacent = calculateNearbyPositions(creep.pos, 1)
  const best = adjacent.reduce((best, pos) => {
    const cost = flowfield.get(pos.x, pos.y);
    if (cost !== 0 && cost < best.cost) {
      return { cost, pos };
    }
    return best;
  }, { cost: Infinity, pos: creep.pos });

  if (!creep.pos.isEqualTo(best.pos)) {
    viz(creep.room.name).line(creep.pos, best.pos, { color: "red" })
  } else {
    viz(creep.room.name).circle(creep.pos.x, creep.pos.y, { radius: 0.5, stroke: "red" })
  }

  move(creep, [best.pos]);
}
