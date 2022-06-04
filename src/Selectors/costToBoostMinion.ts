import { FEATURES } from "config";
import { terminalBalance } from "./terminalBalance";

export function costToBoostMinion(office: string, parts: number, boost: MineralBoostConstant) {
    return FEATURES.LABS ?
        ((terminalBalance(office, RESOURCE_GHODIUM_ACID) >= parts * 30) ? (parts * 20) : 0) / CREEP_LIFE_TIME :
        0;
}
