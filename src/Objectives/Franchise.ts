import { harvestEnergyFromFranchise } from "Behaviors/harvestEnergyFromFranchise";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { adjacentWalkablePositions, getRangeByPath } from "Selectors/MapCoordinates";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { rcl } from "Selectors/rcl";
import { getFranchisePlanBySourceId, roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";
import profiler from "utils/profiler";
import { Objective, Objectives } from "./Objective";


export const FranchiseObjectives: Record<string, FranchiseObjective> = {};

export class FranchiseObjective extends Objective {
    public distance: number = Infinity;
    public disabled = false;
    public minionCosts = 0;
    public constructor(priority: number, public office: string, public sourceId: Id<Source>) {
        super(priority);
        this.id = `FranchiseObjective|${sourceId}`;

        // Singleton per Source
        if (FranchiseObjectives[this.id]) {
            FranchiseObjectives[this.id].setup();
            return FranchiseObjectives[this.id];
        }
        FranchiseObjectives[this.id] = this;
        this.setup();
    }

    checkOffice() {
        if (Game.rooms[this.office]) return true;
        this.disabled = true;
        delete FranchiseObjectives[this.id];
        delete Objectives[this.id];
        return false;
    }

    setup() {
        if (!this.checkOffice()) return; // No office

        if (this.distance !== Infinity && !this.disabled) return; // already set up
        this.minionCosts = (Math.min(Game.rooms[this.office].energyCapacityAvailable, 650) / CREEP_LIFE_TIME) // salesman

        const franchisePos = posById(this.sourceId);
        const storagePos = roomPlans(this.office)?.headquarters?.storage.pos
        if (!storagePos || !franchisePos) {
            this.disabled = true;
            return;
        }
        const distance = getRangeByPath(storagePos, franchisePos, 1, true);
        if (distance === undefined) {
            this.disabled = true;
            return;
        }

        this.distance = distance;
        this.priority += (1 / distance); // Adjusts priority by distance
        this.disabled = false;
    }

    private _energyValue = 0;
    private _energyValueCached = 0;
    energyValue(office: string) {
        if (office !== this.office) return 0; // No office

        if (this._energyValueCached === Game.time) return this._energyValue;

        const franchisePos = posById(this.sourceId);
        if (!franchisePos) return 0; // No idea where this source is
        const reserved = Game.rooms[franchisePos.roomName]?.controller?.reservation?.username === 'LordGreywether';
        const income = ((this.office === franchisePos.roomName || reserved) ? SOURCE_ENERGY_CAPACITY : SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME;

        const workParts = this.assigned.map(byId)
            .filter(c => (!c?.ticksToLive || !c.memory.arrivedAtFranchise) ||
                        (c.ticksToLive < c.memory.arrivedAtFranchise))
            .reduce((sum, c) => sum + (c?.getActiveBodyparts(WORK) ?? 0), 0)
        const efficiency = Math.min(1, (workParts / 5))

        this._energyValue = efficiency * income;
        this._energyValueCached = Game.time;

        return this._energyValue;
    }
    budget(office: string, energy: number) {
        if (office !== this.office || !this.checkOffice()) return {
            cpu: 0,
            spawn: 0,
            energy: 0
        }
        let body = MinionBuilders[MinionTypes.SALESMAN](spawnEnergyAvailable(office));
        let cost = minionCostPerTick(body);
        return {
            cpu: 0.5,
            spawn: body.length * CREEP_SPAWN_TIME,
            energy: cost,
        }
    }
    public hasFixedBudget(office: string) {
        return true;
    }

    spawn() {
        if (!this.checkOffice()) return; // No office
        // Check if site belongs to a new office, and if so, re-prioritize it
        const franchisePos = posById(this.sourceId);
        if (franchisePos && franchisePos?.roomName !== this.office && Memory.offices[franchisePos?.roomName]) {
            this.office = franchisePos.roomName;
            this.priority = 8;
        }

        if (this.disabled || !franchisePos) return;


        if (franchisePos.roomName !== this.office && (
            getTerritoryIntent(this.office) === TerritoryIntent.DEFEND || // Skip spawning for remote Franchises during a crisis
            rcl(this.office) === 8 || // Skip spawning for remote franchises at RCL 8
            (Game.cpu.limit / Object.keys(Memory.offices).length) < 12 // Or when available CPU drops below 12/room
        )) return;

        let salesmen = 0;
        for (let a of this.assigned) {
            const c = byId(a);
            if (!c) continue;
            if (
                c.memory.type === MinionTypes.SALESMAN && (
                    (!c.ticksToLive || !c.memory.arrivedAtFranchise) ||
                    (c.ticksToLive < c.memory.arrivedAtFranchise)
                )
            ) salesmen += 1;
        }

        // Maintain enough Salesman to capitalize the source
        const workPartsPerSalesman = Math.min(5, Math.floor((spawnEnergyAvailable(this.office) - 50) / 100));
        const salesmenPerFranchise = Math.ceil(5 / workPartsPerSalesman);
        const maxSalesmen = adjacentWalkablePositions(franchisePos, true).length;
        const target = Math.min(maxSalesmen, salesmenPerFranchise);
        // Pre-spawn salesmen

        let result: ScreepsReturnCode = OK;
        const plan = getFranchisePlanBySourceId(this.sourceId);
        const preferredSpawn = plan?.spawn.structure as StructureSpawn | undefined
        const containerSpace = plan?.container.pos
        const preferredSalesmenSpaces = preferredSpawn ? [containerSpace].concat(adjacentWalkablePositions(preferredSpawn.pos)).filter(pos => pos?.inRangeTo(franchisePos, 1)) as RoomPosition[] : undefined

        this.metrics.set(this.office, {spawnQuota: target, minions: salesmen})

        if (salesmen < target) {
            spawnMinion(
                this.office,
                this.id,
                MinionTypes.SALESMAN,
                MinionBuilders[MinionTypes.SALESMAN](spawnEnergyAvailable(this.office))
            )({
                preferredSpawn,
                preferredSpaces: preferredSalesmenSpaces
            })
        }
    }

    action(creep: Creep) {
        if (!this.checkOffice()) return; // No office

        harvestEnergyFromFranchise(creep, this.sourceId);

        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.5) {
            const franchisePos = posById(this.sourceId);
            if (creep.memory.office === franchisePos?.roomName) {
                // Local franchise
                const plan = getFranchisePlanBySourceId(this.sourceId)
                if (!plan) return;

                // Try to deposit at spawn
                let result: ScreepsReturnCode = ERR_FULL
                if (plan.spawn.structure) {
                    result = creep.transfer(plan.spawn.structure, RESOURCE_ENERGY)
                }
                // Try to build (or repair) container
                // if (result !== OK && !plan.container.structure) {
                //     if (!plan.container.constructionSite) {
                //         plan.container.pos.createConstructionSite(plan.container.structureType);
                //     } else {
                //         result = creep.build(plan.container.constructionSite);
                //     }
                // }
                // if (result !== OK && plan.container.structure && plan.container.structure.hits < plan.container.structure.hitsMax - 500) {
                //     creep.repair(plan.container.structure);
                // }
                // Try to deposit at link
                if (result !== OK && plan.link.structure) {
                    result = creep.transfer(plan.link.structure, RESOURCE_ENERGY)
                }

                if (result !== OK) {
                    creep.drop(RESOURCE_ENERGY)
                }
            } else {
                // Remote franchise
                const plan = getFranchisePlanBySourceId(this.sourceId)
                if (!plan || !Game.rooms[plan.container.pos.roomName] || rcl(creep.memory.office) < 3) return;

                // Try to build or repair container
                if (!plan.container.structure) {
                    if (!plan.container.constructionSite) {
                        plan.container.pos.createConstructionSite(plan.container.structureType);
                    } else {
                        creep.build(plan.container.constructionSite);
                    }
                } else if (plan.container.structure.hits < plan.container.structure.hitsMax - 500) {
                    creep.repair(plan.container.structure);
                }
            }
        }
    }
}

profiler.registerClass(FranchiseObjective, 'FranchiseObjective')
