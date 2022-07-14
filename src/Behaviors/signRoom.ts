import { controllerPosition } from "Selectors/roomCache";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

export function signRoom(creep: Creep, room: string) {
  const controllerPos = controllerPosition(room);
  if (!controllerPos) return BehaviorResult.FAILURE;
  const result = moveTo(creep, { pos: controllerPos, range: 1 });
  if (result !== BehaviorResult.SUCCESS) return result;
  const controller = Game.rooms[room].controller;
  if (!controller) return BehaviorResult.FAILURE;
  creep.signController(controller, 'This sector property of the Grey Company');
  return BehaviorResult.SUCCESS;
}
