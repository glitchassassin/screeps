import { memoize } from "utils/memoizeFunction";
import { plannedStructuresByRcl } from "./plannedStructuresByRcl";
import { rcl } from "./rcl";

export const repairCostsPerTick = memoize(
    office => office + rcl(office),
    (office: string) => {
        const structures = plannedStructuresByRcl(office, rcl(office))
        let decayPerTick = 0
        for (let s of structures) {
            if (s.structureType === STRUCTURE_ROAD) {
                decayPerTick += ROAD_DECAY_AMOUNT / ROAD_DECAY_TIME;
            } else if (s.structureType === STRUCTURE_CONTAINER) {
                decayPerTick += CONTAINER_DECAY / (Game.rooms[s.pos.roomName]?.controller?.my ? CONTAINER_DECAY_TIME_OWNED : CONTAINER_DECAY_TIME)
            } else if (s.structureType === STRUCTURE_RAMPART) {
                decayPerTick += RAMPART_DECAY_AMOUNT / RAMPART_DECAY_TIME
            }
        }
        return decayPerTick / REPAIR_POWER;
    }
)
