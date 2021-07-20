import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Capacity } from "WorldState/Capacity";
import { Controllers } from "WorldState/Controllers";
import { LogisticsAnalyst } from "../../Analysts/LogisticsAnalyst";
import { Metrics } from "screeps-viz";
import { RoomPlanData } from "WorldState/RoomPlans";
import { SalesAnalyst } from "../../Analysts/SalesAnalyst";
import profiler from "screeps-profiler";

export class PipelineMetrics {
    constructor(
        public mineRate: Metrics.NonNegativeDeltaTimeseries = Metrics.newTimeseries(),
        public mineContainerLevels: Metrics.Timeseries = Metrics.newTimeseries(),
        public roomEnergyLevels: Metrics.Timeseries = Metrics.newTimeseries(),
        public spawnEnergyRate: Metrics.NonNegativeDeltaTimeseries = Metrics.newTimeseries(),
        public storageLevels: Metrics.Timeseries = Metrics.newTimeseries(),
        public storageFillRate: Metrics.NonNegativeDeltaTimeseries = Metrics.newTimeseries(),
        public fleetLevels: Metrics.Timeseries = Metrics.newTimeseries(),
        public controllerDepotLevels: Metrics.Timeseries = Metrics.newTimeseries(),
        public controllerDepotFillRate: Metrics.DeltaTimeseries = Metrics.newTimeseries(),
        public controllerUpgradeRate: Metrics.NonNegativeDeltaTimeseries = Metrics.newTimeseries(),
        public logisticsPrimaryThroughput: Metrics.Timeseries = Metrics.newTimeseries(),
        public deathLossesRate: Metrics.Timeseries = Metrics.newTimeseries(),
    ) { }
}

export class StatisticsAnalyst extends BoardroomManager {
    metrics: Map<string, PipelineMetrics> = new Map();

    tickMetrics: Record<string, Record<string, number>> = {}

    reset() {
        this.metrics = new Map();
        Memory.boardroom.StatisticsAnalyst = "";
    }

    plan() {
        this.boardroom.offices.forEach(office => {
            if (!this.metrics.has(office.name)) {
                this.metrics.set(office.name,  new PipelineMetrics());
            } else {
                let pipelineMetrics = this.metrics.get(office.name) as PipelineMetrics;
                let roomPlan = RoomPlanData.byRoom(office.name);

                let mineRate = 0;
                let mineContainerLevels = 0;
                for (let source of SalesAnalyst.getExploitableSources(office)) {
                    mineRate += source.energy ?? 0;
                    mineContainerLevels += LogisticsAnalyst.calculateFranchiseSurplus(source);
                }
                Metrics.updateNonNegativeDelta(pipelineMetrics.mineRate, -mineRate, 600);
                Metrics.update(pipelineMetrics.mineContainerLevels, mineContainerLevels, 600);
                Metrics.update(
                    pipelineMetrics.roomEnergyLevels,
                    Game.rooms[office.name]?.energyAvailable ?? 0,
                    600
                );
                Metrics.updateNonNegativeDelta(
                    pipelineMetrics.spawnEnergyRate,
                    Game.rooms[office.name]?.energyAvailable ?? 0,
                    600
                );
                Metrics.update(
                    pipelineMetrics.storageLevels,
                    Capacity.byId(LogisticsAnalyst.getStorage(office)?.id)?.used ??
                    LogisticsAnalyst.countEnergyInContainersOrGround(roomPlan?.office?.headquarters.storage?.pos),
                    600
                );
                Metrics.updateNonNegativeDelta(
                    pipelineMetrics.storageFillRate,
                    Capacity.byId(LogisticsAnalyst.getStorage(office)?.id)?.used ??
                    LogisticsAnalyst.countEnergyInContainersOrGround(roomPlan?.office?.headquarters.storage?.pos),
                    600
                );
                let fleetLevel = LogisticsAnalyst.getCarriers(office)
                    .reduce((sum, creep) => (sum + (Capacity.byId(creep.id)?.used ?? 0)), 0)
                Metrics.update(pipelineMetrics.fleetLevels, fleetLevel, 600);

                let controllerDepotLevel = LogisticsAnalyst.countEnergyInContainersOrGround(roomPlan?.office?.headquarters.container?.pos);
                Metrics.update(pipelineMetrics.controllerDepotLevels, controllerDepotLevel, 600);
                Metrics.updateDelta(pipelineMetrics.controllerDepotFillRate, controllerDepotLevel, 600);
                Metrics.updateNonNegativeDelta(pipelineMetrics.controllerUpgradeRate, (Controllers.byRoom(office.name) as StructureController)?.progress ?? 0, 600)

                Metrics.update(
                    pipelineMetrics.logisticsPrimaryThroughput,
                    this.tickMetrics[office.name]?.logisticsPrimaryThroughput ?? 0,
                    600
                )
                this.tickMetrics[office.name] = {};
            }
        })
    }

    reportMetric(officeName: string, metricName: string, value: number) {
        this.tickMetrics[officeName] ??= {}
        this.tickMetrics[officeName][metricName] = (this.tickMetrics[officeName][metricName] ?? 0) + value
    }
}

profiler.registerClass(StatisticsAnalyst, 'StatisticsAnalyst')
