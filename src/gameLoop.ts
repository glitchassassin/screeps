import { scanRooms } from 'Intel/Rooms';
import { recordMetrics } from 'Metrics/recordMetrics';
import { runMissionControl } from 'Missions/Control';
import { run as runReports } from 'Reports/ReportRunner';
import { planRooms } from 'RoomPlanner/planRooms';
import { preTick, reconcileTraffic } from 'screeps-cartographer';
import { recordOverhead } from 'Selectors/cpuOverhead';
import { displayBucket, displayGcl, displaySpawn } from 'Selectors/displayBucket';
import { updateLogisticsTargets } from 'Strategy/Logistics/LogisticsTargets';
import { runStructures } from 'Structures';
import { debugCPU, resetDebugCPU } from 'utils/debugCPU';
import { initializeSpawn } from 'utils/initializeSpawns';

export const gameLoop = () => {
  preTick();
  displayBucket();
  displayGcl();
  displaySpawn();
  resetDebugCPU(true);
  debugCPU('gameLoop setup', true);
  // Cache data where needed
  scanRooms();
  debugCPU('scanRooms', true);

  updateLogisticsTargets();
  debugCPU('Logistics targets', true);

  // Office loop
  // logCpuStart()
  runMissionControl();
  debugCPU('Missions', true);

  reconcileTraffic({ visualize: false });
  debugCPU('Traffic Management', true);

  runStructures();
  debugCPU('Structures', true);

  planRooms();
  debugCPU('planRooms', true);

  recordMetrics();

  runReports();

  // Setup first spawn if needed
  initializeSpawn();

  recordOverhead();

  // if (Game.time % 100 === 0) reportAccuracyLedger();
  // if (Game.time % 100 === 0) reportLogisticsLedger();
  // if (Game.time % 100 === 0) reportHarvestLedger();
  if (Game.time % 100 === 0) {
    const memorySize = JSON.stringify(Memory).length;
    if (memorySize > 1000000) {
      console.log('Memory approaching dangerous levels:', memorySize);
    }
  }
};
