import 'reflect-metadata';
import 'ts-polyfill/lib/es2019-array';
import './utils/RoomVisual';

import { Boardroom } from 'Boardroom/Boardroom';
import MemHack from 'utils/memhack';
import { VisualizationController } from 'utils/VisualizationController';
import { WorldState } from 'WorldState/WorldState';
import { calcTickTime } from 'utils/tickTime';
import profiler from 'screeps-profiler';
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

// Set up defensive profiling
let defensiveProfilingRun = true;

// Initialize control switches
global.v = new VisualizationController()

// Initialize world state
global.worldState = new WorldState();
global.worldState.run();

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
  Memory.cache = {};


  global.worldState = new WorldState();
  global.worldState.run();
  global.boardroom = new Boardroom();
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
function mainLoop() {
  MemHack.pretick();
  if (Game.cpu.bucket < 200) {
    console.log(`Waiting for bucket to reach 200 (currently ${Game.cpu.bucket})`);
    return; // If the bucket gets really low, let it rebuild
  }
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

    global.worldState.run();

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

  if (Game.cpu.bucket <= 5000 && !defensiveProfilingRun) {
    // CPU bucket dropping below 50%, send a CPU profile
    defensiveProfilingRun = true;
    Game.profiler.email(10);
  } else if (Game.cpu.bucket > 6000 && defensiveProfilingRun) {
    // CPU climbing back up, reset the trigger
    defensiveProfilingRun = false;
  }

  calcTickTime()

  if (Game.cpu.bucket >= 10000 && Game.cpu.generatePixel) {
    console.log("Pixel unlocked");
    Game.cpu.generatePixel();
  }
}

profiler.enable()
// export const loop = ErrorMapper.wrapLoop(mainLoop);
export const loop = () => profiler.wrap(mainLoop);
