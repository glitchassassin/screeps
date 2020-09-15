import { Request } from "./Request";
import { EnergyRequest } from "./types/EnergyRequest";
import { MinionRequest } from "./types/MinionRequest";
import { UpgradeRequest } from "./types/UpgradeRequest";

export const requestTypes = [
    MinionRequest,
    EnergyRequest,
    UpgradeRequest,
].reduce((a: {[id: string]: typeof Request}, b) => {
    a[b.name] = b;
    return a;
}, {})
