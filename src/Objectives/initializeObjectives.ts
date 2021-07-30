import { AcquireObjective } from "./Acquire";
import { ExploreObjective } from "./Explore";
import { FacilitiesObjective } from "./Facilities";
import { FranchiseObjective } from "./Franchise";
import { LinkStorageObjective } from "./LinkStorage";
import { MineObjective } from "./Mine";
import { Objective } from "./Objective";
import { RefillExtensionsObjective } from "./RefillExtensions";
import { RefillTowersObjective } from "./RefillTowers";
import { StorageObjective } from "./Storage";
import { TransferToLegalObjective } from "./TransferToLegal";
import { UpgradeObjective } from "./Upgrade";

declare global {
    namespace NodeJS {
        interface Global {
            Objectives: Record<string, Objective>
        }
    }
}

export const Objectives: Record<string, Objective> = {}
/**
 * Objectives sorted by priority descending
 */
export const PrioritizedObjectives: Objective[] = []

const initialize = (...args: Objective[]) => {
    for (let objective of args) {
        Objectives[objective.id] = objective;
        PrioritizedObjectives.push(objective);
    }
    PrioritizedObjectives.sort((a, b) => b.priority - a.priority)
}

initialize(
    new FranchiseObjective(),
    new MineObjective(),
    new FacilitiesObjective(),
    new UpgradeObjective(3),
    new ExploreObjective(),
    new AcquireObjective(),
    // Logistics Objectives - shared by Accountants
    new RefillExtensionsObjective(7),
    new RefillTowersObjective(7),
    new TransferToLegalObjective(7),
    new LinkStorageObjective(5),
    new StorageObjective(3),
);

global.Objectives = Objectives;
