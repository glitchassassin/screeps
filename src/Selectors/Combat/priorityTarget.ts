import { findHostileCreeps } from "Selectors/findHostileCreeps";
import { myDamageNet } from "./costMatrixes";

export const priorityKillTarget = (room: string) => {
  if (!Game.rooms[room]) return;
  const hostiles = findHostileCreeps(room);
  if (!hostiles.length) return;
  return hostiles.reduce((a, b) => myDamageNet(a.pos) > myDamageNet(b.pos) ? a : b);
}
