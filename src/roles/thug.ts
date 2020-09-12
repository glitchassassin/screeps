import { thug } from "behaviors/thug";
import { followFlag } from "behaviors/followFlag";

export const run = (creep: Creep) => {
    thug(creep) || followFlag(creep, 'thugclub');
}
