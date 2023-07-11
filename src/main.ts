// initialize
import 'Missions/MemoryFixes';
import 'reflect-metadata';
import 'ts-polyfill/lib/es2019-array';
import { onRespawn } from 'utils/ResetMemoryOnRespawn';
import MemHack from 'utils/memhack';
import profiler from 'utils/profiler';
import './utils/RoomVisual';
// game loop
import { cpuOverhead } from 'Selectors/cpuOverhead';
import { gameLoop } from 'gameLoop';

try {
  console.log('Global reset detected. Build time', new Date(JSON.parse('__buildDate__')));
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
  Memory.positions = {};
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
      used: Game.cpu.getUsed(),
      heap: 0
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
    console.log(`\nWaiting for bucket to reach 200 (currently ${Game.cpu.bucket})`);
    let missionsCpu = 0;
    let otherCpu = 0;
    for (const k in Memory.stats.profiling) {
      console.log('-', k, Memory.stats.profiling[k]);
      if (k === 'runMissionControl' || k === 'reconcileTraffic') {
        missionsCpu += Memory.stats.profiling[k];
      } else {
        otherCpu += Memory.stats.profiling[k];
      }
    }
    console.log(`Missions CPU: ${missionsCpu} / ${Game.cpu.limit - cpuOverhead()}`);
    console.log(`Other CPU: ${otherCpu} / ${cpuOverhead()}`);
    return; // If the bucket gets really low, let it rebuild
  }
  MemHack.pretick();
  // ErrorMapper.wrapLoop(mainLoop)();
  profiler.wrap(gameLoop);
};
