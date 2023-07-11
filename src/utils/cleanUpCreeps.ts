export function cleanUpCreeps() {
  for (const k in Memory.creeps) {
    if (!Game.creeps[k]) {
      delete Memory.creeps[k];
    }
  }
}
