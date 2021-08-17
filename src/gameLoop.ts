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
import { runTerminal } from "Structures/Terminal";
import { runTowers } from "Structures/Towers";
import { clearNudges } from 'utils/excuseMe';
import { purgeDeadCreeps } from "utils/purgeDeadCreeps";

export const gameLoop = () => {
    purgeDeadCreeps();
    clearNudges();
    // Cache data where needed
    scanRooms();

    // Office loop
    for (const room in Memory.offices) {
        if (!roomPlans(room)?.franchise1) continue; // Skip office until it's (at least partly) planned
        initializeDynamicObjectives(room);
        runLinks(room);
        runSpawns(room);
        runTowers(room);
        runTerminal(room);
    }

    // Main Creep loop
    for (const creep in Game.creeps) {
        runCreepObjective(Game.creeps[creep]);
    }

    // Spawning
    spawnObjectives();

    planRooms();

    recordMetrics();

    runReports();
}
