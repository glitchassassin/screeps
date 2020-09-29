import 'reflect-metadata';
import { ErrorMapper } from "utils/ErrorMapper";
import { Boardroom } from 'Boardroom/Boardroom';

import profiler from 'screeps-profiler';
import { GrafanaAnalyst } from 'Boardroom/BoardroomManagers/GrafanaAnalyst';

// Initialize memory
if (!global.IS_JEST_TEST) {
  console.log(Date.now(), '__buildDate__');

  if (Date.now() - JSON.parse('__buildDate__') < 15000) {
    // Built less than 15 seconds ago - fresh code push
    console.log('New code successfully deployed, build time', new Date(JSON.parse('__buildDate__')));
  } else {
    console.log('Global reset detected');
  }
}


// Initialize Boardroom

global.boardroom = new Boardroom();

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
function mainLoop() {
  // Automatically delete memory of missing creeps
  if(Game.time%1500 === 0) {
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }
  }

  try {
    // Execute Boardroom plan phase
  global.boardroom.plan()
  // Execute Boardroom cleanup phase
  global.boardroom.cleanup()

  global.boardroom.offices.forEach(office => {
    // Execute Office plan phase
    office.plan();
    // Execute Office run phase
    office.run();
    // Execute Office cleanup phase
    office.cleanup();
  });

  (global.boardroom.managers.get('GrafanaAnalyst') as GrafanaAnalyst).exportStats();
  } catch(e) {
    console.log(e, e.stack)
  }


  if (Game.cpu.bucket >= 10000 && Game.cpu.generatePixel) {
    console.log("Pixel unlocked");
    Game.cpu.generatePixel();
  }
}

profiler.enable();
export const loop = ErrorMapper.wrapLoop(() => {
  profiler.wrap(mainLoop)
});
