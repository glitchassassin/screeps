import { remoteFranchises } from "./remoteFranchises";
import { sourceIds } from "./roomCache";

export const franchisesByOffice = (officeName: string) => {
    // TODO: Add sources from territories, limited by spawns
    return sourceIds(officeName)
        .map(source => ({ source, room: officeName, remote: false })).concat(
            remoteFranchises(officeName).map(f => ({...f, remote: true}))
        );
}
