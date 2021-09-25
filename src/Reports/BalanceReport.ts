import { getStorageBudget } from "Selectors/getStorageBudget";
import { roomPlans } from "Selectors/roomPlans";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";

export default () => {
    for (let office in Memory.offices) {
        const hq = roomPlans(office)?.headquarters;
        if (!hq) continue;
        const terminal = hq.terminal.structure as StructureTerminal|undefined;
        const storage = hq.storage.structure as StructureStorage|undefined;

        const terminalTargetLevel = Memory.offices[office].resourceQuotas[RESOURCE_ENERGY] ?? 2000
        const terminalPressure = terminal ? terminal.store.getUsedCapacity(RESOURCE_ENERGY) / terminalTargetLevel : undefined;
        const storageTargetLevel = getStorageBudget(office);
        const storagePressure = storage ? storageEnergyAvailable(office) / storageTargetLevel : undefined;

        if (storagePressure !== undefined && terminalPressure !== undefined) {
            Game.map.visual.rect(
                new RoomPosition(25, 1, office),
                Math.min(25, Math.max(-25, 25 * (terminalPressure - 1))),
                25,
                {fill: '#00ff00'}
            )
            Game.map.visual.rect(
                new RoomPosition(25, 25, office),
                Math.min(25, Math.max(-25, 25 * (storagePressure - 1))),
                25,
                {fill: '#ffff00'}
            )
            Game.map.visual.text('terminal', new RoomPosition(25, 15, office), {fontSize: 10})
            Game.map.visual.text('storage', new RoomPosition(25, 40, office), {fontSize: 10})
        }
    }
}
