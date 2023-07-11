import { defaultRoomCallback } from 'Selectors/Map/Pathing';
import { byId } from 'Selectors/byId';
import { posById } from 'Selectors/posById';
import { getFranchisePlanBySourceId } from 'Selectors/roomPlans';
import { adjacentWalkablePositions, move, moveTo } from 'screeps-cartographer';
import profiler from 'utils/profiler';
import { BehaviorResult } from './Behavior';

export const harvestEnergyFromFranchise = profiler.registerFN((creep: Creep, franchiseTarget: Id<Source>) => {
  const source = byId(franchiseTarget);
  const sourcePos = source?.pos ?? posById(franchiseTarget);
  const plan = getFranchisePlanBySourceId(franchiseTarget);

  if (!sourcePos || (Game.rooms[sourcePos.roomName] && !source)) {
    return BehaviorResult.FAILURE;
  }

  // Prefer to work from container position, fall back to adjacent position
  if (
    plan && creep.pos.isEqualTo(plan.container.pos)
  ) {
    // stay here
    move(creep, [plan.container.pos], 3);
  } else if (
    plan &&
    (!Game.rooms[plan.container.pos.roomName] ||
      plan.container.pos.lookFor(LOOK_CREEPS).filter(c => c.id !== creep.id).length === 0)
  ) {
    // go to container
    moveTo(
      creep,
      { pos: plan.container.pos, range: 0 },
      { roomCallback: defaultRoomCallback({ ignoreFranchises: true }), priority: 3 }
    );
  } else if (
    (plan && creep.pos.inRangeTo(plan.container.pos, 1)) ||
    adjacentWalkablePositions(sourcePos, false).length
  ) {
    // available squares to target
    moveTo(creep, sourcePos, {
      roomCallback: defaultRoomCallback({ ignoreFranchises: true }),
      priority: 3
    });
  } else {
    // stand by in area
    moveTo(creep, { pos: sourcePos, range: 2 });
  }

  if (creep.getActiveBodyparts(WORK) >= 10 && Game.time % 2 === 0) {
    return true; // harvest every other tick
  }
  return creep.harvest(source!) === OK;
}, 'harvestEnergyFromFranchise');
