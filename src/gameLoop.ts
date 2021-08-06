import { scanRooms } from "Intel/Rooms";
import { recordMetrics } from "Metrics/recordMetrics";
import { runSpawns } from "Minions/runSpawns";
import { initializeDynamicObjectives } from "Objectives/initializeDynamicObjectives";
import { runCreepObjective } from "Objectives/runCreepObjective";
import { spawnObjectives } from "Objectives/spawnObjectives";
import { run as runReports } from 'Reports/ReportRunner';
import { planRooms } from "RoomPlanner/planRooms";
import { roomPlans } from "Selectors/roomPlans";
import { runLinks } from "Structures/Links";
import { runTowers } from "Structures/Towers";
import { debugCPU, resetDebugCPU } from "utils/debugCPU";
import { clearNudges } from 'utils/excuseMe';
import { purgeDeadCreeps } from "utils/purgeDeadCreeps";


const DEBUG = false;

export const gameLoop = () => {
    if (DEBUG) resetDebugCPU();
    purgeDeadCreeps();
    clearNudges();
    if (DEBUG) debugCPU('Cleaning up creeps');
    // Cache data where needed
    scanRooms();
    if (DEBUG) debugCPU('Scanning rooms');

    if (DEBUG) debugCPU('Beginning office loop');
    // Office loop
    for (const room in Memory.offices) {
        if (!roomPlans(room)?.office) continue; // Skip office until it's planned

        initializeDynamicObjectives(room);
        if (DEBUG) debugCPU('initializeDynamicObjectives');
        spawnObjectives(room);
        if (DEBUG) debugCPU('spawnObjectives');
        runLinks(room);
        runSpawns(room);
        runTowers(room);
    }

    if (DEBUG) debugCPU('Beginning creep loop');
    // Main Creep loop
    for (const creep in Game.creeps) {
        runCreepObjective(Game.creeps[creep]);
        if (DEBUG) debugCPU('Running creep ' + creep);
    }

    planRooms();
    if (DEBUG) debugCPU('Planning rooms');

    recordMetrics();
    if (DEBUG) debugCPU('Recording metrics');

    runReports();
    if (DEBUG) debugCPU('Running reports');
}
