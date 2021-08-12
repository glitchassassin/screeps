import { getTerritoriesByOffice } from "./getTerritoriesByOffice";
import { sourceIds } from "./roomCache";

export const remoteFranchises = (office: string) => {
    const territories = getTerritoriesByOffice().get(office) ?? [];
    return territories.flatMap(room => sourceIds(room))
}
