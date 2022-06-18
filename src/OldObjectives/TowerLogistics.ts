import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { Budgets } from "Budgets";
import { HEAL_RANGE, RANGED_HEAL_RANGE } from "gameConstants";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { findHostileCreeps, findHostileCreepsInRange } from "Selectors/findHostileCreeps";
import { getTowerRefillerLocation } from "Selectors/getHqLocations";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import { towerDamage } from "Selectors/towerDamage";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        depositSource?: Id<Source>
    }
}

/**
 * Picks up energy from Storage and transfers it to Towers
 */
export class TowerLogisticsObjective extends Objective {
    cost(office: string) {
        return minionCostPerTick(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 3));
    }
    budget(office: string, energy: number) {
        // Energy for spawning
        let body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 3);
        let cost = minionCostPerTick(body);

        const hq = roomPlans(office)?.headquarters;
        const towersNeedRefilled = hq?.towers.some(t => ((t.structure as StructureTower)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > CARRY_CAPACITY * 3)
        const count = (towersNeedRefilled && storageEnergyAvailable(office) !== 0) ? 1 : 0

        // Energy for structures
        const towers = roomPlans(office)?.headquarters?.towers.filter(t => t.structure).length ?? 0;
        const towerCost = (findHostileCreeps(office).length > 0) ? towers : 0
        return {
            cpu: 0.5 * count,
            spawn: body.length * CREEP_SPAWN_TIME * count,
            energy: cost * count + towerCost,
        }
    }
    public hasFixedBudget(office: string) {
        return true;
    }
    structures() {
        for (let office in Memory.offices) {
            const plan = roomPlans(office);
            if (!plan?.headquarters || !Game.rooms[office]) return;

            // Count active towers

            // Select the target that will take the most damage
            const targets = findHostileCreeps(office);
            let priorityTarget: Creep|undefined = undefined;
            let bestDamage = 0;
            for (let target of targets) {
                const damage = plan.headquarters.towers.reduce((sum, t) =>
                    sum + towerDamage(t.structure as StructureTower|undefined, target.pos
                ), 0)
                const exitRange = target.pos.findClosestByRange(FIND_EXIT)?.getRangeTo(target) ?? 50
                const selfHeal = target.getActiveBodyparts(HEAL) * HEAL_POWER;
                const allyHeal = findHostileCreepsInRange(target.pos, RANGED_HEAL_RANGE).reduce((sum, ally) => {
                    return sum + (ally.getActiveBodyparts(HEAL) * (ally.pos.inRangeTo(target.pos, HEAL_RANGE) ? HEAL_POWER : RANGED_HEAL_POWER))
                }, 0)
                const netDamage = (exitRange > 2) ? (damage - (selfHeal + allyHeal)) : 0; // Assume creeps within range of an exit will escape for healing
                if (netDamage > bestDamage) {
                    priorityTarget = target;
                    bestDamage = netDamage;
                }
            }

            // Attack the target, if found
            if (priorityTarget) {
                for (let t of plan.headquarters.towers) {
                    if (!t.structure) continue;
                    if ((t.structure as StructureTower).attack(priorityTarget) === OK) {
                        this.recordEnergyUsed(office, TOWER_ENERGY_COST);
                    }
                }
            }
        }
    }
    spawn() {
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;
            const hq = roomPlans(office)?.headquarters;

            const towersNeedRefilled = hq?.towers.some(t => ((t.structure as StructureTower)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > CARRY_CAPACITY * 3)
            if (budget === 0 || !towersNeedRefilled || storageEnergyAvailable(office) === 0) {
                this.metrics.set(office, {spawnQuota: 0, energyBudget: budget, minions: this.minions(office).length})
                continue
            }
            this.metrics.set(office, {spawnQuota: 1, energyBudget: budget, minions: this.minions(office).length})

            // Maintain one small Accountant to fill towers
            let preferredSpace = getTowerRefillerLocation(office);
            if (this.minions(office).length === 0) {
                this.recordEnergyUsed(office, spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 3)
                )({
                    preferredSpawn: hq?.spawn.structure as StructureSpawn,
                    preferredSpaces: preferredSpace ? [preferredSpace] : undefined,
                    allowOtherSpaces: false
                }))
            }
        }
    }

    action(creep: Creep) {
        // Check HQ state
        const hq = roomPlans(creep.memory.office)?.headquarters;
        if (!hq) return;
        const creepIsEmpty = creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;

        if (!creep.memory.state) {
            if (creepIsEmpty) {
                setState(States.GET_ENERGY_STORAGE)(creep);
            } else {
                setState(States.FILL_TOWERS)(creep);
            }
        }
        if (creep.memory.state === States.GET_ENERGY_STORAGE) {
            const result = getEnergyFromStorage(creep)
            if (result === BehaviorResult.SUCCESS) {
                setState(States.FILL_TOWERS)(creep);
            }
        }
        if (creep.memory.state === States.FILL_TOWERS) {
            if (creepIsEmpty) {
                setState(States.GET_ENERGY_STORAGE)(creep);
                return;
            }
            const tower = hq.towers.find(t => ((t.structure as StructureTower)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) >= creep.store.getCapacity());
            if (tower?.structure && moveTo(tower?.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                creep.transfer(tower.structure, RESOURCE_ENERGY);
            }
        }
    }
}

profiler.registerClass(TowerLogisticsObjective, 'TowerLogisticsObjective')
