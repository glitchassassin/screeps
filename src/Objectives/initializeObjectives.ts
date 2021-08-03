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
import { SupportBootstrapObjective } from "./SupportBootstrap";
import { TransferToLegalObjective } from "./TransferToLegal";
import { UpgradeEngineerObjective } from "./UpgradeEngineer";
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
    new FacilitiesObjective(5),
    new SupportBootstrapObjective(4),
    new UpgradeEngineerObjective(3),
    new UpgradeObjective(),
    new ExploreObjective(),
    new AcquireObjective(),
    // Logistics Objectives - shared by Accountants
    new RefillExtensionsObjective(8),
    new RefillTowersObjective(7),
    new TransferToLegalObjective(6),
    new LinkStorageObjective(5),
    new StorageObjective(3),
);

global.Objectives = Objectives;
