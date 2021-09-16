import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromLink } from "Behaviors/getEnergyFromLink";
import { moveTo } from "Behaviors/moveTo";
import { Budgets } from "Budgets";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { franchiseIncomePerTick } from "Selectors/franchiseStatsPerTick";
import { getHeadquarterLogisticsLocation } from "Selectors/getHqLocations";
import { getStorageBudget } from "Selectors/getStorageBudget";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        depositSource?: Id<Source>
    }
}

/**
 * Picks up energy from Links and transfers it to Storage
 */
export class HeadquartersLogisticsObjective extends Objective {
    budget(office: string, energy: number) {
        let body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office));
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
        for (let office in Memory.offices) {
            const budget = Budgets.get(office)?.get(this.id)?.energy ?? 0;

            // Only needed if we have central HQ structures
            const hq = roomPlans(office)?.headquarters;
            if (!(hq?.terminal.structure || hq?.link.structure || hq?.factory.structure)) {
                continue;
            }

            if (franchiseIncomePerTick(office) <= 0 ) continue; // Only spawn logistics minions if we have active Franchises

            let body = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office));
            let cost = minionCostPerTick(body);
            let actual = this.minions(office).filter(c => !c.ticksToLive || c.ticksToLive > 100).length;
            if (cost >= budget) {
                this.metrics.set(office, {spawnQuota: 0, energyBudget: budget, minions: actual})
                continue;
            }
            this.metrics.set(office, {spawnQuota: 1, energyBudget: budget, minions: actual})

            // Maintain one max-sized Accountant
            if (actual === 0) {
                const preferredSpace = getHeadquarterLogisticsLocation(office);
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))
                )({
                    preferredSpawn: hq.spawn.structure as StructureSpawn,
                    preferredSpaces: preferredSpace ? [preferredSpace] : [],
                    allowOtherSpaces: false
                })
            }
        }
    }

    action(creep: Creep) {
        // Priorities:
        // Link -> Storage
        // Storage <-> Terminal (energy)
        // If link has energy, GET_ENERGY_LINK and DEPOSIT_STORAGE

        // Move to target square if needed
        const targetPos = getHeadquarterLogisticsLocation(creep.memory.office);
        if (moveTo(targetPos, 0)(creep) !== BehaviorResult.SUCCESS) return;

        // Check HQ state
        const hq = roomPlans(creep.memory.office)?.headquarters;
        if (!hq) return;
        const creepEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
        const terminal = hq.terminal.structure as StructureTerminal|undefined;
        const storage = hq.storage.structure as StructureStorage|undefined;
        const spawn = hq.spawn.structure as StructureSpawn|undefined;

        const terminalTargetLevel = Memory.offices[creep.memory.office].resourceQuotas[RESOURCE_ENERGY] ?? 2000
        const terminalPressure = terminal ? terminal.store.getUsedCapacity(RESOURCE_ENERGY) / terminalTargetLevel : undefined;
        const storageTargetLevel = getStorageBudget(creep.memory.office);
        const storagePressure = storage ? storageEnergyAvailable(creep.memory.office) / storageTargetLevel : undefined;

        const spawnCapacity = spawn?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0

        let gotEnergy = false;

        // Emergency provision for over-full Storage
        if (storage && storage.store.getFreeCapacity() < 5000) {
            creep.withdraw(storage, RESOURCE_ENERGY);
            creep.drop(RESOURCE_ENERGY);
            return;
        }

        // First, try to get energy from link
        if (getEnergyFromLink(creep) === BehaviorResult.SUCCESS) {
            gotEnergy = true;
        }

        // Balance energy from Storage to Terminal
        // If storage pressure is higher AND we have no energy, withdraw from storage just enough to correct the imbalance (if more than threshold)
        // If terminal pressure is higher AND we have no energy, withdraw from terminal just enough to correct the imbalance

        const threshold = 100;

        if (terminal && storage && terminalPressure !== undefined && storagePressure !== undefined) {
            if (terminalPressure > storagePressure) {
                const difference = ((terminalPressure - storagePressure) / 2) * terminalTargetLevel
                if (difference > threshold) {
                    const result = creep.withdraw(terminal, RESOURCE_ENERGY, Math.min(difference, creep.store.getFreeCapacity()));
                    gotEnergy = (result === OK);
                }
            } else if (storagePressure > terminalPressure) {
                const difference = ((storagePressure - terminalPressure) / 2) * storageTargetLevel
                if (difference > threshold) {
                    const result = creep.withdraw(storage, RESOURCE_ENERGY, Math.min(difference, creep.store.getFreeCapacity()));
                    gotEnergy = (result === OK);
                }
            }
        }

        // If storage pressure is higher AND we have energy, deposit all energy in terminal
        // If terminal pressure is higher AND we have energy, deposit all energy in storage
        if (spawn && spawnCapacity > 0) {
            if (creepEnergy > 0) {
                creep.transfer(spawn, RESOURCE_ENERGY)
            } else if (!gotEnergy && storage) {
                creep.withdraw(storage, RESOURCE_ENERGY, Math.max(Math.abs(spawnCapacity), creepEnergy))
            }
        } else if (terminal && storagePressure !== undefined && terminalPressure !== undefined && storagePressure > terminalPressure) {
            // Deposit in terminal, if it needs it
            if (creepEnergy > 0) {
                creep.transfer(terminal, RESOURCE_ENERGY)
            }
        } else {
            // Terminal does not need energy, deposit in storage (or drop) instead
            if (storage) {
                if (creep.transfer(storage, RESOURCE_ENERGY) !== OK) {
                    creep.drop(RESOURCE_ENERGY)
                }
            } else {
                creep.drop(RESOURCE_ENERGY);
            }
        }
    }
}

profiler.registerClass(HeadquartersLogisticsObjective, 'HeadquartersLogisticsObjective')
