// initialize
import 'reflect-metadata';
import 'ts-polyfill/lib/es2019-array';
import MemHack from 'utils/memhack';
import profiler from 'utils/profiler';
import { onRespawn } from 'utils/ResetMemoryOnRespawn';
import './utils/RoomVisual';
// game loop
import { gameLoop } from 'gameLoop';

try {
  if (Date.now() - JSON.parse('__buildDate__') < 60000) {
    // Built less than 60 seconds ago - fresh code push
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
  Memory.stats = {
    time: Game.time,
    gcl: {
      progress: Game.gcl.progress,
      progressTotal: Game.gcl.progressTotal,
      level: Game.gcl.level
    },
    cpu: {
      bucket: Game.cpu.bucket,
      limit: Game.cpu.limit,
      used: Game.cpu.getUsed()
    },
    creepCount: Object.keys(Game.creeps).length,
    officeCount: Object.keys(Memory.offices).length,
    profiling: {},
    offices: {}
  };
};

// If respawning, wipe memory clean
onRespawn(global.purge);

// profiler.enable()

export const loop = () => {
  if (Game.cpu.bucket < 500) {
    console.log(`Waiting for bucket to reach 200 (currently ${Game.cpu.bucket})`);
    return; // If the bucket gets really low, let it rebuild
  }
  MemHack.pretick();
  // ErrorMapper.wrapLoop(mainLoop)();
  profiler.wrap(gameLoop);
};
