import { countCreep, creepCount, resetCreepCount } from "Selectors/creepCounter";
import { debugCPU, resetDebugCPU } from "utils/debugCPU";
import { resetObjectivesCapacity, runCreepObjective } from "Objectives/runCreepObjective";

import { assignCreepObjective } from "Objectives/assignCreepObjective";
import { clearNudges } from 'utils/excuseMe';
import { planRooms } from "RoomPlanner/planRooms";
import { purgeDeadCreeps } from "utils/purgeDeadCreeps";
import { recordMetrics } from "Metrics/recordMetrics";
import { runLinks } from "Structures/Links";
import { run as runReports } from 'Reports/ReportRunner';
import { scanRooms } from "Intel/Rooms";
import { spawnMinions } from "Minions/spawnMinions";

const DEBUG = false;

export const gameLoop = () => {
    if (DEBUG) resetDebugCPU();
    purgeDeadCreeps();
    clearNudges();
    if (DEBUG) debugCPU('Cleaning up creeps');
    // Cache data where needed
    scanRooms();
    if (DEBUG) debugCPU('Scanning rooms');

    const unassigned = [];
    resetCreepCount()
    resetObjectivesCapacity()

    if (DEBUG) debugCPU('Beginning creep loop');
    // Main Creep loop
    for (const creep in Game.creeps) {
        if (DEBUG) debugCPU('Running creep ' + creep);
        countCreep(Game.creeps[creep]);
        runCreepObjective(Game.creeps[creep]);
        if (!Game.creeps[creep].memory.objective) unassigned.push(Game.creeps[creep]);
        // console.log(creep, Memory.creeps[creep].objective)
    }
    if (DEBUG) debugCPU('Beginning unassigned creep loop');
    for (const creep of unassigned) {
        assignCreepObjective(creep);
    }

    if (DEBUG) debugCPU('Beginning office loop');
    // Office loop
    for (const room in Memory.offices) {
        spawnMinions(room, creepCount());
        runLinks(room);
    }

    if (DEBUG) debugCPU('Beginning room planning');
    planRooms();

    if (DEBUG) debugCPU('Recording metrics');
    recordMetrics();

    if (DEBUG) debugCPU('Running reports');
    runReports();
}
