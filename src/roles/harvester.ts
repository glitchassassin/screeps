import { depositInPlace } from "behaviors/depositInPlace";
import { harvestInPlace } from "behaviors/harvestInPlace";
import { followFlag } from "behaviors/followFlag";

export const run = (creep: Creep) => {
    followFlag(creep, creep.memory.mine);
    harvestInPlace(creep);
    depositInPlace(creep);
}
