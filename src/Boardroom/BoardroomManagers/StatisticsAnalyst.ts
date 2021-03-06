import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Capacity } from "WorldState/Capacity";
import { ControllerAnalyst } from "Analysts/ControllerAnalyst";
import { Controllers } from "WorldState/Controllers";
import { FacilitiesAnalyst } from "Analysts/FacilitiesAnalyst";
import { HRAnalyst } from "Analysts/HRAnalyst";
import { LogisticsAnalyst } from "../../Analysts/LogisticsAnalyst";
import { Metrics } from "screeps-viz";
import { SalesAnalyst } from "../../Analysts/SalesAnalyst";

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
        public spawnUtilization: Metrics.Timeseries = Metrics.newTimeseries(),
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
                Metrics.updateNonNegativeDelta(
                    pipelineMetrics.mineRate,
                    -SalesAnalyst.getExploitableSources(office)
                        .reduce((sum, source) => (sum + (source.energy ?? 0)), 0),
                    600
                );
                Metrics.update(
                    pipelineMetrics.mineContainerLevels,
                    SalesAnalyst.getExploitableSources(office)
                        .reduce((sum, source) => (sum + LogisticsAnalyst.calculateFranchiseSurplus(source)), 0),
                    600
                );
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
                    LogisticsAnalyst.countEnergyInContainersOrGround(FacilitiesAnalyst.getPlannedStructures(office).find(s => s.structureType === STRUCTURE_STORAGE)?.pos),
                    600
                );
                Metrics.updateNonNegativeDelta(
                    pipelineMetrics.storageFillRate,
                    Capacity.byId(LogisticsAnalyst.getStorage(office)?.id)?.used ??
                    LogisticsAnalyst.countEnergyInContainersOrGround(FacilitiesAnalyst.getPlannedStructures(office).find(s => s.structureType === STRUCTURE_STORAGE)?.pos),
                    600
                );
                let fleetLevel = LogisticsAnalyst.getCarriers(office)
                    .reduce((sum, creep) => (sum + (Capacity.byId(creep.id)?.used ?? 0)), 0)
                Metrics.update(pipelineMetrics.fleetLevels, fleetLevel, 600);
                Metrics.updateNonNegativeDelta(pipelineMetrics.logisticsPrimaryThroughput, fleetLevel, 600);
                Metrics.update(
                    pipelineMetrics.controllerDepotLevels,
                    Capacity.byId(ControllerAnalyst.getDesignatedUpgradingLocations(office)?.containerId)?.used || 0,
                    600
                );
                Metrics.updateDelta(
                    pipelineMetrics.controllerDepotFillRate,
                    Capacity.byId(ControllerAnalyst.getDesignatedUpgradingLocations(office)?.containerId)?.used || 0,
                    600
                );
                Metrics.updateNonNegativeDelta(pipelineMetrics.controllerUpgradeRate, (Controllers.byRoom(office.name) as StructureController)?.progress ?? 0, 600)
                Metrics.update(
                    pipelineMetrics.spawnUtilization,
                    HRAnalyst.getSpawns(office).filter(s => s.spawning).length,
                    600
                );

                let deathLosses = LogisticsAnalyst.getTombstones(office)
                    .filter(t => t.creep.my && t.deathTime === Game.time - 1)
                    .reduce((sum, t) => sum + (Capacity.byId(t.id)?.used ?? 0), 0);

                Metrics.update(
                    pipelineMetrics.deathLossesRate,
                    deathLosses,
                    600
                );

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
