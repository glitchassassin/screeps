import { moveTo } from 'screeps-cartographer';
import { controllerPosition } from 'Selectors/roomCache';
import { BehaviorResult } from './Behavior';

export function signRoom(creep: Creep, room: string) {
  const controllerPos = controllerPosition(room);
  if (!controllerPos) return BehaviorResult.FAILURE;
  moveTo(creep, { pos: controllerPos, range: 1 });
  if (!Game.rooms[room]) return BehaviorResult.INPROGRESS;
  const controller = Game.rooms[room].controller;
  if (!controller) return BehaviorResult.FAILURE;
  creep.signController(controller, 'This sector property of the Grey Company');
  return BehaviorResult.SUCCESS;
}
