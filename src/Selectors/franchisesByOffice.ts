import { sourceIds } from "./roomCache";

export const franchisesByOffice = (officeName: string) => {
    // TODO: Add sources from territories, limited by spawns
    return sourceIds(officeName);
}
