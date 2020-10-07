import 'reflect-metadata';
import MemHack from 'utils/memhack';
import { ErrorMapper } from "utils/ErrorMapper";
import { Boardroom } from 'Boardroom/Boardroom';
import profiler from 'screeps-profiler';
import { GrafanaAnalyst } from 'Boardroom/BoardroomManagers/GrafanaAnalyst';
import { VisualizationController } from 'utils/VisualizationController';
import { resetMemoryOnRespawn } from 'utils/ResetMemoryOnRespawn';
import { log } from 'utils/logger';

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


let lastCPU = 0;
global.reportCPU = (message: string) => {
  log('CPU', `${message} ${(Game.cpu.getUsed() - lastCPU).toFixed(3)}`);
  lastCPU = Game.cpu.getUsed();
}

// Initialize control switches
global.v = new VisualizationController()

global.reportCPU('Loading Boardroom');
// Initialize Boardroom
global.boardroom = new Boardroom();
global.reportCPU('Boardroom Loaded');

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
  lastCPU = 0;
  global.reportCPU('Start Loop')
  MemHack.pretick();
  // Automatically delete memory of missing creeps
  if(Game.time%1500 === 0) {
    for (const name in Memory.creeps) {
      if (!(name in Game.creeps)) {
        delete Memory.creeps[name];
      }
    }
  }
  global.reportCPU('Cleared Creeps (first memory access)')
  try {
    // Execute Boardroom plan phase

    global.boardroom.plan()
    global.reportCPU('Boardroom Plan')

    global.boardroom.offices.forEach(office => {
      // Execute Office plan phase
      office.plan();
      global.reportCPU(`Office ${office.name} Plan`)
      // Execute Office run phase
      office.run();
      global.reportCPU(`Office ${office.name} Run`)
      // Execute Office cleanup phase
      office.cleanup();
      global.reportCPU(`Office ${office.name} Cleanup`)
    });

    // Execute Boardroom cleanup phase
    global.boardroom.cleanup();
    global.reportCPU(`Boardroom Cleanup`)
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
