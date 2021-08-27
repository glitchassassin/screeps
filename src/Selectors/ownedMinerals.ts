import { byId } from "./byId";
import { mineralId } from "./roomCache";

export const ownedMinerals = () => {
    const minerals = new Set();
    for (let office in Memory.offices) {
        const mineral = byId(mineralId(office))?.mineralType
        if (mineral) minerals.add(mineral)
    }
    return minerals;
}
