import { byId } from "./byId"
import { mineralId } from "./roomCache"

export const officeShouldMine = (office: string) => {
    const mineral = byId(mineralId(office))?.mineralType
    const terminal = Game.rooms[office]?.terminal

    if (!mineral || !terminal) return false; // No mineral or no terminal

    const target = Memory.offices[office].resourceQuotas[mineral] ?? 2000
    const actual = terminal.store.getUsedCapacity(mineral)
    if (actual >= target * 2) return false;

    return true;
}
