import { AcquireObjective } from "./Acquire";
import { ExploreObjective } from "./Explore";
import { FacilitiesObjective } from "./Facilities";
import { HeadquartersLogisticsObjective } from "./HeadquartersLogistics";
import { MineObjective } from "./Mine";
import { Objective, Objectives } from "./Objective";
import { RefillExtensionsObjective } from "./RefillExtensions";


declare global {
    namespace NodeJS {
        interface Global {
            Objectives: Record<string, Objective>
        }
    }
}


/**
 * Objectives sorted by priority descending
 */
export const PrioritizedObjectives: Objective[] = []

export const initialize = (...args: Objective[]) => {
    for (let objective of args) {
        if (!Objectives[objective.id]) {
            Objectives[objective.id] = objective;
            PrioritizedObjectives.push(objective);
        }
    }
    PrioritizedObjectives.sort((a, b) => b.priority - a.priority)
}

initialize(
    new HeadquartersLogisticsObjective(10),
    new RefillExtensionsObjective(9),
    // FranchiseObjectives are 8
    new FacilitiesObjective(6),
    new MineObjective(5),
    new ExploreObjective(4),
    new AcquireObjective(4),
    // Remote FranchiseObjectives are 2
);

global.Objectives = Objectives;
