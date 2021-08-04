import { debugCPU, resetDebugCPU } from "utils/debugCPU";

import { clearNudges } from 'utils/excuseMe';
import { initializeDynamicObjectives } from "Objectives/initializeDynamicObjectives";
import { planRooms } from "RoomPlanner/planRooms";
import { purgeDeadCreeps } from "utils/purgeDeadCreeps";
import { recordMetrics } from "Metrics/recordMetrics";
import { runCreepObjective } from "Objectives/runCreepObjective";
import { runLinks } from "Structures/Links";
import { run as runReports } from 'Reports/ReportRunner';
import { runSpawns } from "Minions/runSpawns";
import { scanRooms } from "Intel/Rooms";
import { spawnObjectives } from "Objectives/spawnObjectives";

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
        initializeDynamicObjectives(room);
        if (DEBUG) debugCPU('initializeDynamicObjectives');
        spawnObjectives(room);
        if (DEBUG) debugCPU('spawnObjectives');
        runLinks(room);
        runSpawns(room);
    }

    if (DEBUG) debugCPU('Beginning creep loop');
    // Main Creep loop
    for (const creep in Game.creeps) {
        if (DEBUG) debugCPU('Running creep ' + creep);
        runCreepObjective(Game.creeps[creep]);
    }

    if (DEBUG) debugCPU('Beginning room planning');
    planRooms();

    if (DEBUG) debugCPU('Recording metrics');
    recordMetrics();

    if (DEBUG) debugCPU('Running reports');
    runReports();
}
