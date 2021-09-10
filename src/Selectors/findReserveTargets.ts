import { FranchiseObjectives } from "Objectives/Franchise";
import { posById } from "./posById";

export const findReserveTargets = (office: string) => {
    const franchises = new Set<string>();
    for (let o of Object.values(FranchiseObjectives)) {
        const room = posById(o.sourceId)?.roomName;
        if (
            room &&
            o.office === office &&
            o.assigned.length >= 1 &&
            !Memory.offices[room]
        ) {
            franchises.add(room);
        }
    }
    return franchises;
}
