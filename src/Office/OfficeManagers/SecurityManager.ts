import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { TransferTask } from "TaskRequests/types/TransferTask";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";

export class SecurityManager extends OfficeManager {
    towers: StructureTower[] = [];
    plan() {
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        let room = this.office.center.room;
        this.towers = global.analysts.defense.getTowers(this.office);

        switch (this.status) {
            case OfficeManagerStatus.MINIMAL: {
                this.towers.forEach(t => {
                    // Request energy, if needed
                    let e = getTransferEnergyRemaining(t);
                    if (e) {
                        if (e > 700) {
                            this.office.submit(new TaskRequest(t.id, new TransferTask(t), 5, e));
                        } else if (e > 150) {
                            this.office.submit(new TaskRequest(t.id, new TransferTask(t), 4, e));
                        } else if (e > 0) {
                            this.office.submit(new TaskRequest(t.id, new TransferTask(t), 1, e));
                        }
                    }
                })
                return;
            }
            case OfficeManagerStatus.NORMAL: {
                this.towers.forEach(t => {
                    // Request energy, if needed
                    let e = getTransferEnergyRemaining(t);
                    if (e) {
                        if (e > 700) {
                            this.office.submit(new TaskRequest(t.id, new TransferTask(t), 9, e));
                        } else if (e > 150) {
                            this.office.submit(new TaskRequest(t.id, new TransferTask(t), 5, e));
                        } else if (e > 0) {
                            this.office.submit(new TaskRequest(t.id, new TransferTask(t), 1, e));
                        }
                    }
                })
                return;
            }
            case OfficeManagerStatus.PRIORITY: {
                this.towers.forEach(t => {
                    // Request energy, if needed
                    let e = getTransferEnergyRemaining(t);
                    if (e) {
                        if (e > 150) {
                            this.office.submit(new TaskRequest(t.id, new TransferTask(t), 9, e));
                        } else if (e > 0) {
                            this.office.submit(new TaskRequest(t.id, new TransferTask(t), 1, e));
                        }
                    }
                })
                return;
            }
        }
    }
    run() {
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        let targets = global.analysts.defense.getPrioritizedAttackTargets(this.office);
        let healTargets = global.analysts.defense.getPrioritizedHealTargets(this.office);

        this.towers.forEach(t => {
            // Simple priorities
            if (targets.length > 0) {
                if (t.attack(targets[0]) === OK) {
                    global.analysts.grafana.reportAttack(this.office.name, 10);
                }
            } else if (healTargets.length > 0) {
                if (t.heal(healTargets[0]) === OK) {
                    global.analysts.grafana.reportHeal(this.office.name, 10);
                }
            }
        })
    }
}
