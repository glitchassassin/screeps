import { calculateBudgets } from "Budgets/calculateBudgets";
import { FEATURES } from "config";
import { scanRooms } from "Intel/Rooms";
import { recordMetrics } from "Metrics/recordMetrics";
import { runSpawns } from "Minions/runSpawns";
import { initializeDynamicObjectives } from "Objectives/initializeDynamicObjectives";
import { runCreepObjective } from "Objectives/runCreepObjective";
import { spawnObjectives } from "Objectives/spawnObjectives";
import { run as runReports } from 'Reports/ReportRunner';
import { planRooms } from "RoomPlanner/planRooms";
import { roomPlans } from "Selectors/roomPlans";
import { runLabs } from "Structures/Labs/Labs";
import { planLabOrders } from "Structures/Labs/planLabOrders";
import { runLinks } from "Structures/Links";
import { runTerminals } from "Structures/Terminal";
import { runTowers } from "Structures/Towers";
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
        runLinks(room);
        // logCpu('runLinks')
        runSpawns(room);
        // logCpu('runSpawns')
        runTowers(room);
        // logCpu('runTowers')
        if (FEATURES.LABS) {
            planLabOrders(room);
            runLabs(room);
        }
        // logCpu('runLabs')
    }
    debugCPU('Offices', true);

    // Main Creep loop
    for (const creep in Game.creeps) {
        runCreepObjective(Game.creeps[creep]);
    }
    debugCPU('Creeps', true);

    // terminals
    runTerminals();
    debugCPU('runTerminals', true);
    // Spawning
    spawnObjectives();
    debugCPU('spawnObjectives', true);

    planRooms();
    debugCPU('planRooms', true);

    recordMetrics();

    runReports();
}
