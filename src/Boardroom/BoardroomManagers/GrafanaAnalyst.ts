import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Capacity } from "WorldState/Capacity";
import { ControllerAnalyst } from "./ControllerAnalyst";
import { FranchiseData } from "WorldState/FranchiseData";
import { LogisticsAnalyst } from "./LogisticsAnalyst";
import { Office } from "Office/Office";
import { RoomData } from "WorldState/Rooms";
import { SalesAnalyst } from "./SalesAnalyst";
import { StatisticsAnalyst } from "./StatisticsAnalyst";
import { calculateFranchiseSurplus } from "utils/gameObjectSelectors";

export class GrafanaAnalyst extends BoardroomManager {
    deltas: {
        [id: string]: {
            building: number,
            repairing: number
        }
    } = {};
    plan() {
        this.boardroom.offices.forEach(office => {
            this.deltas[office.name] = {
                building: 0,
                repairing: 0
            };

            for (let room of RoomData.byOffice(office)) {
                if (!Game.rooms[room.name]) return;
                Game.rooms[room.name].getEventLog().forEach(event => {
                    switch (event.event) {
                        case EVENT_BUILD:
                            this.deltas[office.name].building += event.data.energySpent;
                            break;
                        case EVENT_REPAIR:
                            this.deltas[office.name].repairing += event.data.energySpent;
                            break;
                    }
                })
            }
        });
    }
    pipelineMetrics(office: Office) {
        let controllerAnalyst = this.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;
        let logisticsAnalyst = this.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let salesAnalyst = this.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let statisticsAnalyst = this.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;

        let upgradeDepot = controllerAnalyst.getDesignatedUpgradingLocations(office)?.containerId
        let storage = logisticsAnalyst.getStorage(office);

        let fleet = logisticsAnalyst.getCarriers(office);
        let mobileDepots = logisticsAnalyst.depots.get(office.name) ?? [];

        return {
            sourcesLevel: salesAnalyst.getUsableSourceLocations(office).reduce((sum, source) => (sum + ("energy" in source ? source.energy : 0)), 0),
            sourcesMax: salesAnalyst.getUsableSourceLocations(office).reduce((sum, source) => (sum + ("energyCapacity" in source ? source.energyCapacity : 0)), 0),
            mineContainersLevel: salesAnalyst.getUsableSourceLocations(office)
                .reduce((sum, source) => (sum + calculateFranchiseSurplus(source)), 0),
            mineContainersMax: salesAnalyst.getUsableSourceLocations(office)
                .reduce((sum, source) => (sum + (Capacity.byId(FranchiseData.byId(source.id)?.containerId)?.capacity || 0)), 0),
            storageLevel: Capacity.byId(storage?.id)?.used ?? 0,
            storageMax: Capacity.byId(storage?.id)?.capacity ?? 0,
            upgradeDepotLevel: Capacity.byId(upgradeDepot)?.used ?? 0,
            upgradeDepotMax: Capacity.byId(upgradeDepot)?.capacity ?? 0,
            carrierFleetLevel: fleet.reduce((sum, creep) => sum + (Capacity.byId(creep.id)?.used ?? 0), 0),
            carrierFleetMax: fleet.reduce((sum, creep) => sum + (Capacity.byId(creep.id)?.capacity ?? 0), 0),
            mobileDepotsLevel: mobileDepots.reduce((sum, creep) => sum + (Capacity.byId(creep)?.used ?? 0), 0),
            mobileDepotsMax: mobileDepots.reduce((sum, creep) => sum + (Capacity.byId(creep)?.capacity ?? 0), 0),
            roomEnergyLevel: Game.rooms[office.name].energyAvailable,
            roomEnergyMax: Game.rooms[office.name].energyCapacityAvailable,
            buildDelta: this.deltas[office.name].building,
            repairDelta: this.deltas[office.name].repairing,
            pipelineThroughput: statisticsAnalyst.metrics.get(office.name)?.logisticsThroughput.mean() ?? 0
        }
    }
    cleanup() {
        const stats: {[id: string]: {
            pipelineMetrics: {
                sourcesLevel: number,
                mineContainersLevel: number
            },
            controllerProgress: number;
            controllerProgressTotal: number;
            controllerLevel: number; }
        } = {};
        this.boardroom.offices.forEach(office => {
            let controller = Game.rooms[office.name].controller;
            if (controller?.my) {
                stats[office.name] = {
                    pipelineMetrics: this.pipelineMetrics(office),
                    controllerProgress: controller.progress,
                    controllerProgressTotal: controller.progressTotal,
                    controllerLevel: controller.level,
                }
            }
        })
        // Reset stats object
        Memory.stats = {
            gcl: {
                progress: Game.gcl.progress,
                progressTotal: Game.gcl.progressTotal,
                level: Game.gcl.level,
            },
            offices: stats,
            cpu: {
                bucket: Game.cpu.bucket,
                limit: Game.cpu.limit,
                used: Game.cpu.getUsed(),
            },
            time: Game.time,
        };
    }
}
