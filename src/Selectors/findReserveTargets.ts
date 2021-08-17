import { FranchiseObjective } from "Objectives/Franchise";
import { Objectives } from "Objectives/Objective";
import { posById } from "./posById";

export const findReserveTargets = (office: string) => {
    const franchises = new Set<FranchiseObjective>();
    for (let o of Object.values(Objectives)) {
        if (
            o instanceof FranchiseObjective &&
            o.office === office &&
            o.assigned.length > 1 &&
            !Memory.offices[posById(o.sourceId)?.roomName ?? ''] &&
            Memory.rooms[posById(o.sourceId)?.roomName ?? '']?.sourceIds?.length === 2
        ) {
            franchises.add(o);
        }
    }
    return franchises;
}
