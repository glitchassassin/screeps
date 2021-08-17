import { FEATURES } from "config";
import { AcquireObjective } from "./Acquire";
import { DefendObjective } from "./Defend";
import { ExploreObjective } from "./Explore";
import { FacilitiesObjective } from "./Facilities";
import { HeadquartersLogisticsObjective } from "./HeadquartersLogistics";
import { MineObjective } from "./Mine";
import { Objective, Objectives } from "./Objective";
import { RefillExtensionsObjective } from "./RefillExtensions";
import { TowerLogisticsObjective } from "./TowerLogistics";
import { UpgradeObjective } from "./Upgrade";


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
    new DefendObjective(8.5),
    new TowerLogisticsObjective(8.5),
    // FranchiseObjectives are 8
    new FacilitiesObjective(6),
    new ExploreObjective(4),
    new AcquireObjective(4),
    new UpgradeObjective(3),
    // Remote FranchiseObjectives are 2
);
if (FEATURES.MINING) initialize(new MineObjective(5));

global.Objectives = Objectives;
