export function cleanUpCreeps() {
  if (Game.time % 10 !== 0) return;
  for (const k in Memory.creeps) {
    if (!Game.creeps[k]) {
      delete Memory.creeps[k];
    }
  }
}
