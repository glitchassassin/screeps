import { defaultRoomCallback } from 'Selectors/Map/Pathing';
import { byId } from 'Selectors/byId';
import { posById } from 'Selectors/posById';
import { moveTo } from 'screeps-cartographer';
import { BehaviorResult } from '../Behavior';

/**
 * Returns SUCCESS if expected to complete this tick, FAILURE if it
 * cannot complete (or source is depleted), INPROGRESS otherwise
 */
export const fromSource = (creep: Creep, sourceId: Id<Source>) => {
  const sourcePos = posById(sourceId);
  if (!sourcePos) return BehaviorResult.FAILURE;
  moveTo(
    creep,
    { pos: sourcePos, range: 1 },
    { roomCallback: defaultRoomCallback({ ignoreFranchises: true }), }
  );

  // failure cases
  const source = byId(sourceId);
  if (!source) {
    if (Game.rooms[sourcePos.roomName]) {
      return BehaviorResult.FAILURE;
    } else {
      return BehaviorResult.INPROGRESS;
    }
  }
  if (source.energy === 0) return BehaviorResult.FAILURE;

  // everything is in order: attempt to harvest
  if (
    creep.harvest(source) === OK &&
    creep.store.getFreeCapacity(RESOURCE_ENERGY) <= creep.getActiveBodyparts(WORK) * HARVEST_POWER
  ) {
    return BehaviorResult.SUCCESS;
  }
  return BehaviorResult.INPROGRESS;
};
