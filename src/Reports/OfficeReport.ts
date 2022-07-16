import { MissionType } from "Missions/Mission";
import { activeMissions } from "Missions/Selectors";
import { rcl } from "Selectors/rcl";

// Show current priority: building, repairing, filling storage, upgrading, acquiring
// Show secondary activities: mining, labs/boosting
// Summarize economy state: franchise income, total budgets
// Show RCL meter
// Show this on the world map

export default () => {
    for (let office in Memory.offices) {
        Game.map.visual.text(rcl(office).toString(), new RoomPosition(25, 25, office));

        let currentPriority = '';
        let mining = false;
        let science = false;
        const meterProgress = Game.rooms[office].controller!.progress / Game.rooms[office].controller!.progressTotal
        const meterMessage = `${(meterProgress * 100).toFixed(0)}%`;
        const meterColor = '#0000ff';
        for (const mission of activeMissions(office)) {
            if (mission.type === MissionType.MINE_FOREMAN) mining = true;
            if (mission.type === MissionType.SCIENCE) science = true;
        }
        if (currentPriority === '') continue;

        if (mining) {
            Game.map.visual.text('⛏', new RoomPosition(40, 10, office))
        }
        if (science) {
            Game.map.visual.text('🔬', new RoomPosition(30, 10, office))
        }

        // Draw meter
        Game.map.visual.rect(new RoomPosition(0, 40, office), 50, 10, { stroke: meterColor, fill: 'transparent' });
        Game.map.visual.rect(new RoomPosition(0, 40, office), 50 * Math.max(0, Math.min(1, meterProgress)), 10, { stroke: 'transparent', fill: meterColor });
        Game.map.visual.text(meterMessage, new RoomPosition(25, 45, office));
    }
}
