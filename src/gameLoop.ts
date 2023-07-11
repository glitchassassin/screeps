import { runIntel } from 'Intel';
import { recordMetrics } from 'Metrics/recordMetrics';
import { cleanMissions, purgeOrphanedMissions } from 'Missions/BaseClasses/MissionImplementation';
import { runMissionControl } from 'Missions/Control';
import { run as runReports } from 'Reports/ReportRunner';
import { planRooms } from 'RoomPlanner/planRooms';
import { preTick, reconcileTraffic } from 'screeps-cartographer';
import { recordOverhead } from 'Selectors/cpuOverhead';
import { displayBucket, displayGcl, displayGpl, displaySpawn } from 'Selectors/displayBucket';
import { runScheduled } from 'Selectors/scheduledCallbacks';
import { runStructures } from 'Structures';
import { runTaskManager } from 'TaskManager';
import { cleanUpCreeps } from 'utils/cleanUpCreeps';
import { initializeSpawn } from 'utils/initializeSpawns';

export const gameLoop = () => {
  runTaskManager([
    { name: 'preTick', fn: preTick, mandatory: true }, // must run first

    { name: 'cleanUpCreeps', fn: cleanUpCreeps, runEvery: 10 },
    { name: 'cleanMissions', fn: cleanMissions },
    { name: 'displayBucket', fn: displayBucket },
    { name: 'displayGcl', fn: displayGcl },
    { name: 'displayGpl', fn: displayGpl },
    { name: 'displaySpawn', fn: displaySpawn },
    { name: 'runScheduled', fn: runScheduled, mandatory: true },
    { name: 'runIntel', fn: runIntel, mandatory: true },
    { name: 'runStructures', fn: runStructures, mandatory: true },
    { name: 'planRooms', fn: planRooms, threshold: 5000, },
    { name: 'recordMetrics', fn: recordMetrics },
    { name: 'purgeOrphanedMissions', fn: purgeOrphanedMissions },
    { name: 'runReports', fn: runReports, threshold: 1000, },

    { name: 'runMissionControl', fn: runMissionControl, mandatory: true },
    { name: 'reconcileTraffic', fn: reconcileTraffic, mandatory: true }, // must run after missions
    { name: 'initializeSpawn', fn: initializeSpawn, mandatory: true },
    { name: 'recordOverhead', fn: recordOverhead, mandatory: true }, // must run last
  ], Game.cpu.limit * 0.4, false);

  if (Game.time % 100 === 0) {
    const memorySize = JSON.stringify(Memory).length;
    if (memorySize > 1000000) {
      console.log('Memory approaching dangerous levels:', memorySize);
      console.log(
        Object.keys(Memory)
          .map(k => `Memory.${k}: ${JSON.stringify(Memory[k as keyof Memory]).length}`)
          .join('\n')
      );
    }
  }
};
