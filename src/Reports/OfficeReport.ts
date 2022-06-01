import { Budgets } from "Budgets";
import { facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";
import { findAcquireTarget } from "Selectors/findAcquireTarget";
import { findHostileCreeps } from "Selectors/findHostileCreeps";
import { getStorageBudget } from "Selectors/getStorageBudget";
import { rcl } from "Selectors/rcl";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";

// Show current priority: building, repairing, filling storage, upgrading, acquiring
// Show secondary activities: mining, labs/boosting
// Summarize economy state: franchise income, total budgets
// Show RCL meter
// Show this on the world map

export default () => {
    for (let office in Memory.offices) {
        const viz = new RoomVisual(office);

        Game.map.visual.text(rcl(office).toString(), new RoomPosition(25, 25, office));

        let currentPriority = '';
        let mining = false;
        let science = false;
        let maxEnergy = 0;
        let meterProgress = 1;
        let meterMessage = '';
        let meterColor = 'transparent';
        for (let [id, budget] of Budgets.get(office) ?? []) {
            if (budget.energy > maxEnergy) {
                maxEnergy = budget.energy;
                currentPriority = id;
            }
            if (id === 'MineObjective' && budget.energy > 0) mining = true;
            if (id === 'ScienceObjective' && budget.energy > 0) science = true;
        }
        if (currentPriority === '') continue;

        '⚔🛡📈💰🏦🚚⚡'
        switch(currentPriority) {
            case 'HeadquartersLogisticsObjective':
            case 'RefillExtensionsObjective':
            case 'ReserveObjective':
            case 'LogisticsObjective': {
                Game.map.visual.text('🏦', new RoomPosition(10, 10, office));
                meterProgress = (storageEnergyAvailable(office) / getStorageBudget(office));
                meterMessage = `${(meterProgress * 100).toFixed(0)}%`;
                meterColor = '#ffff00';
                break;
            }
            case 'FacilitiesObjective': {
                Game.map.visual.text('🛠', new RoomPosition(10, 10, office));
                meterMessage = facilitiesWorkToDo(office).length.toString();
                meterColor = '#00ff00';
                break;
            }
            case 'UpgradeObjective': {
                Game.map.visual.text('📈', new RoomPosition(10, 10, office));
                meterProgress = Game.rooms[office].controller!.progress / Game.rooms[office].controller!.progressTotal
                meterMessage = `${(meterProgress * 100).toFixed(0)}%`;
                meterColor = '#0000ff';
                break;
            }
            case 'DefendObjective': {
                Game.map.visual.text('🛡', new RoomPosition(10, 10, office));
                meterMessage = findHostileCreeps(office).length.toString();
                meterColor = '#ff0000';
                break;
            }
            case 'AcquireObjective': {
                Game.map.visual.text('🚚', new RoomPosition(10, 10, office));
                const acquireTarget = rcl(findAcquireTarget() ?? '');
                meterProgress = acquireTarget / 4;
                meterMessage = `${acquireTarget}/4`;
                meterColor = '#ff00ff';
                break;
            }
            default: {
                Game.map.visual.text('?', new RoomPosition(10, 10, office));
                break;
            }
        }
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
