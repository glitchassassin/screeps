import { moveByPath, moveTo } from 'screeps-cartographer';
import { franchiseRoadsToBuild } from 'Selectors/plannedFranchiseRoads';
import { roomPlans } from 'Selectors/roomPlans';
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
