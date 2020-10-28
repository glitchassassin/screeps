import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";

import { DefenseAnalyst } from "Boardroom/BoardroomManagers/DefenseAnalyst";
import { DefenseTask } from "../OfficeTaskManager/TaskRequests/types/DefenseTask";
import { ExploreTask } from "../OfficeTaskManager/TaskRequests/types/ExploreTask";
import { HRManager } from "../HRManager";
import { IdleTask } from "../OfficeTaskManager/TaskRequests/types/IdleTask";
import { LogisticsManager } from "../LogisticsManager";
import { OfficeManagerStatus } from "Office/OfficeManager";
import { OfficeTaskManager } from "../OfficeTaskManager/OfficeTaskManager";
import { Table } from "Visualizations/Table";
import { TransferRequest } from "Logistics/LogisticsRequest";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

export class SecurityManager extends OfficeTaskManager {
    plan() {
        super.plan();
        let defenseAnalyst = global.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let hrManager = this.office.managers.get('HRManager') as HRManager;
        if (this.status === OfficeManagerStatus.OFFLINE) return;

        let internCount = 0;
        for (let i of defenseAnalyst.getInterns(this.office)) { internCount += 1; }
        let guardCount = 0;
        for (let i of defenseAnalyst.getGuards(this.office)) { guardCount += 1; }

        let priority = 3;
        switch (this.status) {
            case OfficeManagerStatus.MINIMAL: {
                priority = 3;
                break;
            }
            case OfficeManagerStatus.NORMAL: {
                priority = 5;
                break;
            }
            case OfficeManagerStatus.PRIORITY: {
                priority = 7;
                break;
            }
        }

        // Maintain tower upkeep
        for (let t of defenseAnalyst.getTowers(this.office)) {
            if (!t.gameObj) continue;
            // Request energy, if needed
            let e = getTransferEnergyRemaining(t);
            if (e) {
                let adjustedPriority = priority;
                if (e > 700) {
                    adjustedPriority += 2;
                } else if (e > 150) {
                    adjustedPriority += 1;
                }
                logisticsManager.submit(t.id, new TransferRequest(t, adjustedPriority));
            }
        }

        let territoryToScan;
        let lastScan = 0;
        // Plan defensive operations
        for (let t of this.office.territories) {
            let intent = defenseAnalyst.getTerritoryIntent(t.name)
            if (intent === 'DEFEND' || intent === 'ACQUIRE') {
                this.submit(`${t.name}_Defense`, new DefenseTask(t, priority));
            }

            let period = (intent === 'AVOID') ? 1000 : 100;
            let scanned = defenseAnalyst.getTerritoryScanned(t.name) ?? 0;
            if (
                Game.time - scanned > period &&
                (!territoryToScan || lastScan < scanned)
            ) {
                territoryToScan = t;
                lastScan = scanned;
            }
        }

        if (territoryToScan) {
            this.submit(territoryToScan.name, new ExploreTask(territoryToScan.name, priority - 1))
        }

        // Maintain one Intern to handle scouting tasks
        for (let [,request] of this.requests) {
            if (request instanceof ExploreTask && internCount === 0) {
                hrManager.submit(new MinionRequest(`${this.office.name}_Sec_Int`, priority - 1, MinionTypes.INTERN, {manager: this.constructor.name}))
            }
            // If we have Defense tasks, spawn Guards indefinitely
            if (request instanceof DefenseTask && guardCount < 3) {
                hrManager.submit(new MinionRequest(`${this.office.name}_Sec_Ops`, priority + 1, MinionTypes.GUARD, {manager: this.constructor.name}))
                break;
            }
        }
        // Recycle any unneeded guards
        this.submit(`${this.office.name}_Sec_Idle`, new IdleTask(new RoomPosition(25, 25, this.office.name), 1))
    }
    run() {
        super.run();
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        let defenseAnalyst = global.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let [target] = defenseAnalyst.getPrioritizedAttackTargets(this.office);
        let [healTarget] = defenseAnalyst.getPrioritizedHealTargets(this.office);

        if (target || healTarget)
        for (let t of defenseAnalyst.getTowers(this.office)) {
            // Simple priorities
            if (target) {
                t.gameObj?.attack(target.gameObj)
            } else if (healTarget) {
                t.gameObj?.heal(healTarget.gameObj)
            }
        }

        if (global.v.security.state) {
            this.report();
        }
    }
    report() {
        super.report();
        let statusTable = [
            ['Territory', 'Last Surveyed'],
            ...this.office.territories.map(t => [t.name, t.scanned])
        ]
        Table(new RoomPosition(2, 2, this.office.center.name), statusTable);
    }
}

profiler.registerClass(SecurityManager, 'SecurityManager');
