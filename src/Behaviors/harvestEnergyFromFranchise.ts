import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { defaultRoomCallback } from 'Selectors/Map/Pathing';
import { posById } from 'Selectors/posById';
import { getFranchisePlanBySourceId } from 'Selectors/roomPlans';
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
    plan &&
    (!Game.rooms[plan.container.pos.roomName] ||
      plan.container.pos.lookFor(LOOK_CREEPS).filter(c => c.id !== creep.id).length === 0) &&
    !plan.link.structure
  ) {
    creep.room.visual.line(creep.pos, plan.container.pos, { color: 'cyan' });
    moveTo(
      creep,
      { pos: plan.container.pos, range: 0 },
      { roomCallback: defaultRoomCallback({ ignoreFranchises: true }), visualizePathStyle: { stroke: 'cyan' } }
    );
  } else {
    moveTo(creep, sourcePos, {
      roomCallback: defaultRoomCallback({ ignoreFranchises: true }),
      visualizePathStyle: { stroke: 'magenta' }
    });
  }

  return creep.harvest(source!) === OK;
}, 'harvestEnergyFromFranchise');
