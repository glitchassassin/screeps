import 'reflect-metadata';
import 'ts-polyfill/lib/es2019-array';
import './utils/RoomVisual';

import MemHack from 'utils/memhack';
import { gameLoop } from 'gameLoop';
import { onRespawn } from 'utils/ResetMemoryOnRespawn';
import profiler from 'screeps-profiler';

try {
  if (Date.now() - JSON.parse('__buildDate__') < 15000) {
    // Built less than 15 seconds ago - fresh code push
    console.log('New code successfully deployed, build time', new Date(JSON.parse('__buildDate__')));
  } else {
    console.log('Global reset detected');
  }
} catch {
  // Ignore
}

global.purge = () => {
  Memory.flags = {};
  Memory.rooms = {};
  Memory.creeps = {};
  Memory.powerCreeps = {};
  Memory.offices = {};
  Memory.roomPlans = {};
}

// If respawning, wipe memory clean
onRespawn(global.purge);

profiler.enable()

export const loop = () => {
  MemHack.pretick();
  if (Game.cpu.bucket < 200) {
    console.log(`Waiting for bucket to reach 200 (currently ${Game.cpu.bucket})`);
    return; // If the bucket gets really low, let it rebuild
  }
  // ErrorMapper.wrapLoop(mainLoop)();
  profiler.wrap(gameLoop);
}
