import { franchiseRoadsToBuild } from 'Selectors/plannedFranchiseRoads';
import { roomPlans } from 'Selectors/roomPlans';
import { viz } from 'Selectors/viz';
import { CachingStrategies, Keys, getCachedPath, moveByPath, moveTo } from 'screeps-cartographer';
import { BehaviorResult } from './Behavior';

export const followPathHomeFromSource = (creep: Creep, office: string, sourceId: Id<Source>) => {
  if (creep.pos.roomName === office) return BehaviorResult.SUCCESS;
  if (franchiseRoadsToBuild(office, sourceId).length) {
    moveTo(creep, roomPlans(office)?.headquarters?.storage.pos ?? { pos: new RoomPosition(25, 25, office), range: 20 });
  } else {
    moveByPath(creep, office + sourceId, { reverse: true, visualizePathStyle: { stroke: 'cyan' } });
  }
  return BehaviorResult.INPROGRESS;
};

export function isCloserToDestination(origin: Creep, target: Creep, office: string, sourceId?: Id<Source>) {
  // default to "go home" path
  let creepPath = getCachedPath(office + sourceId)?.slice().reverse();
  if (!sourceId || origin.pos.roomName === office || franchiseRoadsToBuild(office, sourceId).length || !creepPath) {
    // use creep-cached path instead
    creepPath = getCachedPath(Keys.creepKey(origin, '_cp'), { cache: CachingStrategies.HeapCache })
  }

  if (!creepPath) {
    return false; // no cached path found
  }

  const currentPos = creepPath.findIndex(t => t.isEqualTo(origin.pos))

  if (currentPos === -1 || currentPos === creepPath.length - 1) {
    return false; // not on path, or at end of path
  }

  // if target is on the next step, it is closer
  if (creepPath[currentPos + 1].isEqualTo(target.pos)) {
    return true;
  }

  const targetSquare = creepPath[currentPos + 2];

  if (targetSquare) viz(origin.pos.roomName).line(origin.pos.x, origin.pos.y, targetSquare.x, targetSquare.y, { color: "green" })

  if (targetSquare && target.pos.getRangeTo(targetSquare) < origin.pos.getRangeTo(targetSquare)) {
    // the other creep is closer to the destination along our current path
    return true;
  }
  // the other creep is not closer or it doesn't matter
  return false;
}
