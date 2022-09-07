import { scanRooms } from 'Intel/Rooms';
import { reportLogisticsLedger } from 'Ledger/LogisticsLedger';
import { recordMetrics } from 'Metrics/recordMetrics';
import { spawnFromQueues } from 'Minions/spawnQueues';
import { runMissionControl } from 'Missions/Control';
import { run as runReports } from 'Reports/ReportRunner';
import { planRooms } from 'RoomPlanner/planRooms';
import { preTick, reconcileTraffic } from 'screeps-cartographer';
import { recordOverhead } from 'Selectors/cpuOverhead';
import { displayBucket, displayGcl, displaySpawn } from 'Selectors/displayBucket';
import { runStructures } from 'Structures';
import { debugCPU, resetDebugCPU } from 'utils/debugCPU';
import { initializeSpawn } from 'utils/initializeSpawns';
import { purgeDeadCreeps } from 'utils/purgeDeadCreeps';

export const gameLoop = () => {
  preTick();
  displayBucket();
  displayGcl();
  displaySpawn();
  resetDebugCPU(true);
  purgeDeadCreeps();
  debugCPU('gameLoop setup', true);
  // Cache data where needed
  scanRooms();
  debugCPU('scanRooms', true);

  // Office loop
  // logCpuStart()
  runMissionControl();
  debugCPU('Missions', true);

  spawnFromQueues();
  debugCPU('Spawns', true);

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
  if (Game.time % 100 === 0) reportLogisticsLedger();
};
