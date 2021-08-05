import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { States, setState } from "Behaviors/states";
import { adjacentWalkablePositions, getRangeByPath, isPositionWalkable } from "Selectors/MapCoordinates";
import { getFranchisePlanBySourceId, roomPlans } from "Selectors/roomPlans";

import { BehaviorResult } from "Behaviors/Behavior";
import { Objective } from "./Objective";
import { byId } from "Selectors/byId";
import { carryPartsForFranchiseRoute } from "Selectors/carryPartsForFranchiseRoute";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { getEnergyFromFranchise } from "Behaviors/getEnergyFromFranchise";
import { harvestEnergyFromFranchise } from "Behaviors/harvestEnergyFromFranchise";
import { moveTo } from "Behaviors/moveTo";
import { posById } from "Selectors/posById";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

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
        const storagePos = roomPlans(this.office)?.office.headquarters.storage.pos
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

    energyValue(office: string) {
        if (office !== this.office) return 0;
        const franchisePos = posById(this.sourceId);
        const link = getFranchisePlanBySourceId(this.sourceId)?.link.structure
        if (!franchisePos) return 0; // No idea where this source is
        const income = ((this.office === franchisePos.roomName) ? SOURCE_ENERGY_CAPACITY : SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME;

        const salesmanCost = 650 / CREEP_LIFE_TIME;
        const accountantCost = link ? 0 : (this.targetCarryParts * 1.5 * BODYPART_COST[CARRY]) / CREEP_LIFE_TIME

        return this.assigned.length ? income - (salesmanCost + accountantCost) : 0;
    }

    spawn(office: string, spawns: StructureSpawn[]) {
        if (this.disabled || office !== this.office) return 0; // Only spawn in assigned office
        const franchisePos = posById(this.sourceId);
        if (!franchisePos) return 0; // No idea where this source is

        let spawnQueue = [];

        // Maintain enough Salesman to capitalize the source
        const workPartsPerSalesman = Math.min(5, Math.floor((spawnEnergyAvailable(office) - 50) / 100));
        const salesmenPerFranchise = Math.ceil(5 / workPartsPerSalesman);
        const maxSalesmen = adjacentWalkablePositions(franchisePos).length;
        const target = Math.min(maxSalesmen, salesmenPerFranchise);
        // Pre-spawn salesmen
        const salesmen = this.assigned.map(byId).filter(c => {
            if (c?.memory.type !== MinionTypes.SALESMAN) return false;
            if (!c.ticksToLive) return true;
            if (!c.memory.arrivedAtFranchise) return true;
            return (c.ticksToLive < c.memory.arrivedAtFranchise);
        }).length;

        if (salesmen < target) {
            spawnQueue.push((spawn: StructureSpawn) => spawn.spawnCreep(
                MinionBuilders[MinionTypes.SALESMAN](spawnEnergyAvailable(office)),
                `${MinionTypes.SALESMAN}${Game.time % 10000}`,
                { memory: {
                    type: MinionTypes.SALESMAN,
                    office,
                    objective: this.id,
                }}
            ))
        }

        // Maintain one appropriately-sized Accountant
        const targetCarry = this.targetCarryParts;
        const carryPartsPerAccountant = Math.min(32, Math.floor((spawnEnergyAvailable(office) * 2/3) / 50))
        const link = getFranchisePlanBySourceId(this.sourceId)?.link.structure
        const surplus = franchiseEnergyAvailable(this.sourceId);
        let targetAccountants = 0; // No need for Accountants if there is a link
        if (!link) targetAccountants = Math.ceil(targetCarry / carryPartsPerAccountant);
        if (link && surplus) targetAccountants = 1;
        // Pre-spawn accountants
        const accountants = this.assigned.map(byId).filter(c => {
            if (c?.memory.type !== MinionTypes.ACCOUNTANT) return false;
            if (!c.ticksToLive) return true;
            return (c.ticksToLive > 100);
        }).length

        if (accountants < targetAccountants) {
            spawnQueue.push((spawn: StructureSpawn) => spawn.spawnCreep(
                MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), targetCarry),
                `${MinionTypes.ACCOUNTANT}${Game.time % 10000}`,
                { memory: {
                    type: MinionTypes.ACCOUNTANT,
                    office,
                    objective: this.id,
                }}
            ))
        }

        // Truncate spawn queue to length of available spawns
        spawnQueue = spawnQueue.slice(0, spawns.length);

        // For each available spawn, up to the target number of minions,
        // try to spawn a new minion
        spawnQueue.forEach((spawner, i) => spawner(spawns[i]));

        return spawnQueue.length;
    }

    action = (creep: Creep) => {
        if (this.disabled) return;

        if (creep.memory.type === MinionTypes.SALESMAN || creep.memory.type === MinionTypes.ACCOUNTANT) {
            this.actions[creep.memory.type](creep);
        }
    }

    actions = {
        [MinionTypes.SALESMAN]: (creep: Creep) => {
            harvestEnergyFromFranchise(creep, this.sourceId);

            if (creep.memory.franchiseTarget && creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.8) {
                const plan = getFranchisePlanBySourceId(creep.memory.franchiseTarget)
                if (!plan) return;

                // Try to deposit at spawn
                let result: ScreepsReturnCode = ERR_FULL
                if (plan.spawn.structure) {
                    result = creep.transfer(plan.spawn.structure, RESOURCE_ENERGY)
                }
                if (result !== OK && plan.link.structure) {
                    creep.transfer(plan.link.structure, RESOURCE_ENERGY)
                }
            }
        },
        [MinionTypes.ACCOUNTANT]: (creep: Creep) => {
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
                    }
                }
            }
            if (creep.memory.state === States.DEPOSIT) {
                const storage = roomPlans(creep.memory.office)?.office.headquarters.storage;
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
        }
    }
}

