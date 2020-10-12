import { DefenseAnalyst } from "Boardroom/BoardroomManagers/DefenseAnalyst";
import { TransferRequest } from "Logistics/LogisticsRequest";
import { OfficeManagerStatus } from "Office/OfficeManager";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { LogisticsManager } from "./LogisticsManager";
import { OfficeTaskManager } from "./OfficeTaskManager/OfficeTaskManager";
import { ExploreTask } from "./OfficeTaskManager/TaskRequests/types/ExploreTask";

export class SecurityManager extends OfficeTaskManager {
    towers: StructureTower[] = [];
    plan() {
        super.plan();
        let defenseAnalyst = global.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        this.towers = defenseAnalyst.getTowers(this.office);

        // Scout surrounding Territories, if needed
        let unexplored = this.office.territories.filter(t => !t.scanned && !t.isHostile);
        if (unexplored.length > 0) {
            unexplored.forEach(territory => {
                this.submit(territory.name, new ExploreTask(territory.name, 5))
            })
        }

        switch (this.status) {
            case OfficeManagerStatus.MINIMAL: {
                this.towers.forEach(t => {
                    // Request energy, if needed
                    let e = getTransferEnergyRemaining(t);
                    if (e) {
                        let priority = 1;
                        if (e > 700) {
                            priority = 5;
                        } else if (e > 150) {
                            priority = 4;
                        } else if (e > 0) {
                            priority = 1;
                        }

                        logisticsManager.submit(t.id, new TransferRequest(t, priority));
                    }
                })
                return;
            }
            case OfficeManagerStatus.NORMAL: {
                this.towers.forEach(t => {
                    // Request energy, if needed
                    let e = getTransferEnergyRemaining(t);
                    if (e) {
                        let priority = 1;
                        if (e > 700) {
                            priority = 9;
                        } else if (e > 150) {
                            priority = 5;
                        } else if (e > 0) {
                            priority = 1;
                        }

                        logisticsManager.submit(t.id, new TransferRequest(t, priority));
                    }
                })
                return;
            }
            case OfficeManagerStatus.PRIORITY: {
                this.towers.forEach(t => {
                    // Request energy, if needed
                    let e = getTransferEnergyRemaining(t);
                    if (e) {
                        let priority = 1;
                        if (e > 150) {
                            priority = 9;
                        } else if (e > 0) {
                            priority = 1;
                        }

                        logisticsManager.submit(t.id, new TransferRequest(t, priority));
                    }
                })
                return;
            }
        }
    }
    run() {
        super.run();
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        let defenseAnalyst = global.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let targets = defenseAnalyst.getPrioritizedAttackTargets(this.office);
        let healTargets = defenseAnalyst.getPrioritizedHealTargets(this.office);

        this.towers.forEach(t => {
            // Simple priorities
            if (targets.length > 0) {
                t.attack(targets[0])
            } else if (healTargets.length > 0) {
                t.heal(healTargets[0])
            }
        })
    }
}
