import { scanRooms } from "Intel/Rooms";
import { recordMetrics } from "Metrics/recordMetrics";
import { spawnFromQueues } from "Minions/spawnQueues";
import { runMissionControl } from "Missions/Control";
import { run as runReports } from 'Reports/ReportRunner';
import { planRooms } from "RoomPlanner/planRooms";
import { debugCPU, resetDebugCPU } from "utils/debugCPU";
import { clearNudges } from 'utils/excuseMe';
import { purgeDeadCreeps } from "utils/purgeDeadCreeps";

export const gameLoop = () => {
    resetDebugCPU(true);
    purgeDeadCreeps();
    clearNudges();
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

    planRooms();
    debugCPU('planRooms', true);

    recordMetrics();

    runReports();
}
