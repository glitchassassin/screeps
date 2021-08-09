import profiler from "screeps-profiler"
import { remoteFranchises } from "Selectors/remoteFranchises"
import { sourceIds } from "Selectors/roomCache"
import { FranchiseObjective } from "./Franchise"
import { initialize } from "./initializeObjectives"

export const initializeDynamicObjectives = profiler.registerFN((room: string) => {
    initialize(
        ...sourceIds(room).map(id => new FranchiseObjective(8, room, id)),
        ...remoteFranchises(room).map(id => new FranchiseObjective(2, room, id)),
    )
}, 'initializeDynamicObjectives')
