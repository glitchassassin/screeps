import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromFranchise } from "Behaviors/getEnergyFromFranchise";
import { harvestEnergyFromFranchise } from "Behaviors/harvestEnergyFromFranchise";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { carryPartsForFranchiseRoute } from "Selectors/carryPartsForFranchiseRoute";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { adjacentWalkablePositions, getRangeByPath, isPositionWalkable } from "Selectors/MapCoordinates";
import { posById } from "Selectors/posById";
import { getFranchisePlanBySourceId, roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


const franchiseObjectives: Record<string, FranchiseObjective> = {};

export class FranchiseObjective extends Objective {
    public distance: number = Infinity;
    public disabled = false;
    public targetCarryParts = 0;
    public constructor(priority: number, public office: string, public sourceId: Id<Source>) {
        super(priority);
        this.id = `FranchiseObjective|${sourceId}`;

        // Singleton per Source
        if (franchiseObjectives[this.id]) {
            return franchiseObjectives[this.id];
        }
        franchiseObjectives[this.id] = this;

        const franchisePos = posById(this.sourceId);
        const storagePos = roomPlans(this.office)?.headquarters?.storage.pos
        if (!storagePos || !franchisePos) {
            this.disabled = true;
            return;
        }
        const distance = getRangeByPath(storagePos, franchisePos, 1);
        if (distance === undefined) {
            this.disabled = true;
            return;
        }

        this.distance = distance;
        this.priority += (1 / distance); // Adjusts priority by distance
        this.targetCarryParts = carryPartsForFranchiseRoute(franchisePos.roomName === office, this.distance)
    }

    private _energyValue = 0;
    private _energyValueCached = 0;
    energyValue(office: string) {
        if (office !== this.office) return 0;
        if (this._energyValueCached === Game.time) return this._energyValue;
        const franchisePos = posById(this.sourceId);
        const link = getFranchisePlanBySourceId(this.sourceId)?.link.structure
        if (!franchisePos) return 0; // No idea where this source is
        const reserved = Game.rooms[franchisePos.roomName]?.controller?.reservation?.username === 'LordGreywether';
        const income = ((this.office === franchisePos.roomName || reserved) ? SOURCE_ENERGY_CAPACITY : SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME;

        const salesmanCost = 650 / CREEP_LIFE_TIME;
        const accountantCost = link ? 0 : (this.targetCarryParts * 1.5 * BODYPART_COST[CARRY]) / CREEP_LIFE_TIME

        const workParts = this.assigned.map(byId).reduce((sum, c) => sum + (c?.getActiveBodyparts(WORK) ?? 0), 0)
        const efficiency = Math.min(1, (workParts / 5))

        this._energyValue = efficiency * (income - (salesmanCost + accountantCost));
        this._energyValueCached = Game.time;
        return this._energyValue;
    }

    spawn() {
        // Check if site belongs to a new office, and if so, disable it
        const franchisePos = posById(this.sourceId);
        if (franchisePos && franchisePos?.roomName !== this.office && Memory.offices[franchisePos?.roomName]) {
            this.disabled = true;
        }

        if (this.disabled || !franchisePos) return;

        // Skip spawning for remote Franchises during a crisis
        if (franchisePos.roomName !== this.office && getTerritoryIntent(this.office) === TerritoryIntent.DEFEND) return;

        let salesmen = 0, accountants = 0;
        for (let a of this.assigned) {
            const c = byId(a);
            if (!c) continue;
            if (
                c.memory.type === MinionTypes.SALESMAN && (
                    (!c.ticksToLive || !c.memory.arrivedAtFranchise) ||
                    (c.ticksToLive < c.memory.arrivedAtFranchise)
                )
            ) salesmen += 1;
            if (
                c.memory.type === MinionTypes.ACCOUNTANT && (
                    !c.ticksToLive ||
                    c.ticksToLive > 100
                )
            ) accountants += 1;
        }

        // Maintain enough Salesman to capitalize the source
        const workPartsPerSalesman = Math.min(5, Math.floor((spawnEnergyAvailable(this.office) - 50) / 100));
        const salesmenPerFranchise = Math.ceil(5 / workPartsPerSalesman);
        const maxSalesmen = adjacentWalkablePositions(franchisePos, true).length;
        const target = Math.min(maxSalesmen, salesmenPerFranchise);
        let salesmenPressure = salesmen / target;
        // Pre-spawn salesmen

        // Maintain one appropriately-sized Accountant
        const reserved = Memory.rooms[franchisePos.roomName].reserver === 'LordGreywether';
        const targetCarry = this.targetCarryParts * (reserved ? 2 : 1)
        const carryPartsPerAccountant = Math.min(32, Math.floor((spawnEnergyAvailable(this.office) * 2/3) / 50))
        const plan = getFranchisePlanBySourceId(this.sourceId);
        const link = plan?.link.structure
        const surplus = franchiseEnergyAvailable(this.sourceId);
        let targetAccountants = 0; // No need for Accountants if there is a link
        if (!link) targetAccountants = Math.ceil(targetCarry / carryPartsPerAccountant);
        if (link && surplus) targetAccountants = 1;
        let accountantPressure = accountants / targetAccountants;
        // Pre-spawn accountants

        let result: ScreepsReturnCode = OK;
        const preferredSpawn = plan?.spawn.structure as StructureSpawn|undefined
        const containerSpace = plan?.container.pos
        const preferredSalesmenSpaces = preferredSpawn ? [containerSpace].concat(adjacentWalkablePositions(preferredSpawn.pos)).filter(pos => pos?.inRangeTo(franchisePos, 1)) as RoomPosition[] : undefined

        if (accountantPressure < 1 && accountantPressure < salesmenPressure) {
            result = spawnMinion(
                this.office,
                this.id,
                MinionTypes.ACCOUNTANT,
                MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(this.office), targetCarry)
            )({
                preferredSpawn,
            })
        } else if (salesmenPressure < 1) {
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
        if (this.disabled) {
            creep.suicide();
            return;
        }

        if (creep.memory.type === MinionTypes.SALESMAN || creep.memory.type === MinionTypes.ACCOUNTANT) {
            this.actions[creep.memory.type](creep);
        }
    }

    actions = {
        [MinionTypes.SALESMAN]: profiler.registerFN((creep: Creep) => {
            harvestEnergyFromFranchise(creep, this.sourceId);

            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.8) {
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
                    // if (!plan.container.structure) {
                    //     if (!plan.container.constructionSite) {
                    //         plan.container.pos.createConstructionSite(plan.container.structureType);
                    //     } else {
                    //         creep.build(plan.container.constructionSite);
                    //     }
                    // } else if (plan.container.structure.hits < plan.container.structure.hitsMax - 500) {
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
                    const rcl = Game.rooms[creep.memory.office].controller?.level ?? 0;
                    if (!plan || !Game.rooms[plan.container.pos.roomName] || rcl < 4) return;

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
        }, 'FranchiseObjective.action[SALESMAN]'),
        [MinionTypes.ACCOUNTANT]: profiler.registerFN((creep: Creep) => {
            const franchisePos = posById(this.sourceId);
            if (franchisePos?.roomName !== creep.memory.office && getTerritoryIntent(creep.memory.office) === TerritoryIntent.DEFEND) {
                // Skip hauling and retreat to remote Franchise during a crisis
                moveTo(franchisePos, 3)(creep)
                return;
            }

            if (!creep.memory.state) {
                if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                    setState(States.WITHDRAW)(creep);
                } else {
                    setState(States.DEPOSIT)(creep);
                }
            }
            if (creep.memory.state === States.WITHDRAW) {
                // Opportunity targets
                const tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 1).shift()
                if (tombstone) creep.withdraw(tombstone, RESOURCE_ENERGY)

                if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                    setState(States.DEPOSIT)(creep);
                } else {
                    if (franchiseEnergyAvailable(this.sourceId)) {
                        const result = getEnergyFromFranchise(creep, this.sourceId);
                        if (result === BehaviorResult.SUCCESS) {
                            setState(States.DEPOSIT)(creep);
                        }
                    } else {
                        // Return to post to wait for energy
                        moveTo(posById(this.sourceId), 3)(creep)
                    }
                }
            }
            if (creep.memory.state === States.DEPOSIT) {
                const storage = roomPlans(creep.memory.office)?.headquarters?.storage;
                if (!storage) return;
                if (storage.structure) {
                    if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                        creep.transfer(storage.structure, RESOURCE_ENERGY);
                        setState(States.WITHDRAW)(creep);
                    }
                } else if (isPositionWalkable(storage.pos)) {
                    // Drop at storage position
                    if (moveTo(storage.pos, 0)(creep) === BehaviorResult.SUCCESS) {
                        creep.drop(RESOURCE_ENERGY);
                        setState(States.WITHDRAW)(creep);
                    }
                } else {
                    // Drop next to storage under construction
                    if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                        creep.drop(RESOURCE_ENERGY);
                        setState(States.WITHDRAW)(creep);
                    }
                }
            }
        }, 'FranchiseObjective.action[ACCOUNTANT]')
    }
}

profiler.registerClass(FranchiseObjective, 'FranchiseObjective')
