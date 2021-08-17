import { getTerritoriesByOffice } from "./getTerritoriesByOffice";
import { sourceIds } from "./roomCache";

export const remoteFranchises = (office: string) => {
    const territories = getTerritoriesByOffice(office);
    return territories.flatMap(room => sourceIds(room))
}
