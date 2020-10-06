import 'reflect-metadata';
import { ErrorMapper } from "utils/ErrorMapper";
import { Boardroom } from 'Boardroom/Boardroom';
import profiler from 'screeps-profiler';
import { GrafanaAnalyst } from 'Boardroom/BoardroomManagers/GrafanaAnalyst';
import { VisualizationController } from 'utils/VisualizationController';
import { resetMemoryOnRespawn } from 'utils/ResetMemoryOnRespawn';

if (!global.IS_JEST_TEST) {
  if (Date.now() - JSON.parse('__buildDate__') < 15000) {
    // Built less than 15 seconds ago - fresh code push
    console.log('New code successfully deployed, build time', new Date(JSON.parse('__buildDate__')));
  } else {
    console.log('Global reset detected');
  }
}
// If respawning, wipe memory clean
resetMemoryOnRespawn();

// Initialize control switches
global.v = new VisualizationController()

// Initialize Boardroom
global.boardroom = new Boardroom();

global.purge = () => {
  Memory.flags = {};
  Memory.rooms = {};
  Memory.creeps = {};
  Memory.metrics = {};
  Memory.offices = {};
  Memory.hr = {};
  Memory.tasks = {};
  Memory.boardroom = {};

  global.boardroom = new Boardroom();
}

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

    global.boardroom.offices.forEach(office => {
      // Execute Office plan phase
      office.plan();
      // Execute Office run phase
      office.run();
      // Execute Office cleanup phase
      office.cleanup();
    });

    // Execute Boardroom cleanup phase
    global.boardroom.cleanup();
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
