import { FEATURES } from "config";
import { PrioritizedObjectives } from "Objectives";
import { AcquireObjective } from "./Acquire";
import { DefendObjective } from "./Defend";
import { ExploreObjective } from "./Explore";
import { FacilitiesObjective } from "./Facilities";
import { HeadquartersLogisticsObjective } from "./HeadquartersLogistics";
import { LogisticsObjective } from "./Logistics";
import { MineObjective } from "./Mine";
import { Objective, Objectives } from "./Objective";
import { PlunderObjective } from "./Plunder";
import { PriorityLogisticsObjective } from "./PriorityLogistics";
import { RefillExtensionsObjective } from "./RefillExtensions";
import { ReserveObjective } from "./Reserve";
import { ScienceObjective } from "./Science";
import { TowerLogisticsObjective } from "./TowerLogistics";
import { TradeObjective } from "./Trade";
import { UpgradeObjective } from "./Upgrade";


declare global {
    namespace NodeJS {
        interface Global {
            Objectives: Record<string, Objective>
        }
    }
}

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
    new PriorityLogisticsObjective(9.2),
    new RefillExtensionsObjective(9.1),
    // FranchiseObjectives are 8.5
    // Remote FranchiseObjectives are 8
    new ReserveObjective(7.5),
    new ExploreObjective(6.7),
    new DefendObjective(6.6),
    new TowerLogisticsObjective(6.5),
    new FacilitiesObjective(5.2),
    new UpgradeObjective(5),
    new PlunderObjective(4),
    new AcquireObjective(3),
    new LogisticsObjective(1),
    new TradeObjective(1),
);

if (FEATURES.LABS) initialize(new ScienceObjective(5.1));
if (FEATURES.MINING) initialize(new MineObjective(5));

// global.Objectives = Objectives;
