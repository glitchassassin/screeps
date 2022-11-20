import { scanRooms } from 'Intel/Rooms';
import { recordMetrics } from 'Metrics/recordMetrics';
import { cleanMissions } from 'Missions/BaseClasses/MissionImplementation';
import { runMissionControl } from 'Missions/Control';
import { run as runReports } from 'Reports/ReportRunner';
import { planRooms } from 'RoomPlanner/planRooms';
import { preTick, reconcileTraffic } from 'screeps-cartographer';
import { recordOverhead } from 'Selectors/cpuOverhead';
import { displayBucket, displayGcl, displayGpl, displaySpawn } from 'Selectors/displayBucket';
import { runScheduled } from 'Selectors/scheduledCallbacks';
import { runStructures } from 'Structures';
import { cleanUpCreeps } from 'utils/cleanUpCreeps';
import { debugCPU, resetDebugCPU } from 'utils/debugCPU';
import { initializeSpawn } from 'utils/initializeSpawns';

const DEBUG_IN_MEMORY = true;

export const gameLoop = () => {
  preTick();
  cleanUpCreeps();
  cleanMissions();
  displayBucket();
  displayGcl();
  displayGpl();
  displaySpawn();
  resetDebugCPU(DEBUG_IN_MEMORY);
  debugCPU('gameLoop setup');
  runScheduled();
  debugCPU('Scheduled tasks');

  // Cache data where needed
  scanRooms();
  debugCPU('scanRooms');

  // Office loop
  // logCpuStart()
  runMissionControl();
  debugCPU('Missions');

  reconcileTraffic({ visualize: false });
  debugCPU('Traffic Management');

  runStructures();
  debugCPU('Structures');

  planRooms();
  debugCPU('planRooms');

  recordMetrics();

  runReports();

  // Setup first spawn if needed
  initializeSpawn();

  debugCPU('metrics');

  recordOverhead();

  // roomPlans('W12S3')?.perimeter?.ramparts.forEach(r =>
  //   viz(r.pos.roomName).circle(r.pos.x, r.pos.y, { radius: 0.5, fill: r.structure ? 'green' : 'red' })
  // );

  // if (Game.time % 100 === 0) reportAccuracyLedger();
  // if (Game.time % 100 === 0) reportLogisticsLedger();
  // if (Game.time % 100 === 0) reportHarvestLedger();
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
