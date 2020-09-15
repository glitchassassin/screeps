import { Request } from "./Request";
import { BuildRequest } from "./types/BuildRequest";
import { EnergyRequest } from "./types/EnergyRequest";
import { MinionRequest } from "./types/MinionRequest";
import { UpgradeRequest } from "./types/UpgradeRequest";

export const requestTypes = [
    MinionRequest,
    EnergyRequest,
    UpgradeRequest,
    BuildRequest,
].reduce((a: {[id: string]: typeof Request}, b) => {
    a[b.name] = b;
    return a;
}, {})
