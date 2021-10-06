import { calculateBudgets } from "Budgets/calculateBudgets";
import { scanRooms } from "Intel/Rooms";
import { recordMetrics } from "Metrics/recordMetrics";
import { runSpawns } from "Minions/runSpawns";
import { initializeDynamicObjectives } from "Objectives/initializeDynamicObjectives";
import { runCreepObjective } from "Objectives/runCreepObjective";
import { spawnObjectives } from "Objectives/spawnObjectives";
import { structureObjectives } from "Objectives/structureObjectives";
import { run as runReports } from 'Reports/ReportRunner';
import { planRooms } from "RoomPlanner/planRooms";
import { roomPlans } from "Selectors/roomPlans";
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
    for (const room in Memory.offices) {
        if (!roomPlans(room)?.franchise1) continue; // Skip office until it's (at least partly) planned
        initializeDynamicObjectives(room);
        // logCpu('initializeDynamicObjectives')
        calculateBudgets(room);
        // logCpu('calculateBudgets')
        runSpawns(room);
        // logCpu('runSpawns')
    }
    debugCPU('Offices', true);

    structureObjectives();
    debugCPU('Structures', true);

    // Main Creep loop
    for (const creep in Game.creeps) {
        runCreepObjective(Game.creeps[creep]);
    }
    debugCPU('Creeps', true);

    // Spawning
    spawnObjectives();
    debugCPU('spawnObjectives', true);

    planRooms();
    debugCPU('planRooms', true);

    recordMetrics();

    runReports();
}
