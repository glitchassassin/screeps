import { Objectives } from "Objectives/Objective";
import { byId } from "Selectors/byId";
import profiler from "utils/profiler";

export const purgeDeadCreeps = profiler.registerFN(() => {
  // Automatically delete memory of missing creeps
  if(Game.time%1500 === 0) {
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }
  }
  Object.values(Objectives).forEach(o => {
    o.assigned = o.assigned.filter(byId);
  })
}, 'purgeDeadCreeps')
