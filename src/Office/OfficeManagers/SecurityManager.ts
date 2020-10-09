import { DefenseAnalyst } from "Boardroom/BoardroomManagers/DefenseAnalyst";
import { TransferRequest } from "Logistics/LogisticsRequest";
import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { LogisticsManager } from "./LogisticsManager";

export class SecurityManager extends OfficeManager {
    towers: StructureTower[] = [];
    plan() {
        let defenseAnalyst = global.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        this.towers = defenseAnalyst.getTowers(this.office);

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
