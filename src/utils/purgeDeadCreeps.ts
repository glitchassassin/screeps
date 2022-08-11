import profiler from 'utils/profiler';

export const purgeDeadCreeps = profiler.registerFN(() => {
  // Automatically delete memory of missing creeps
  if (Game.time % 10 === 0) {
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }
  }
}, 'purgeDeadCreeps');
