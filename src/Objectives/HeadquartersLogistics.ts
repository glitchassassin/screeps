import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromLink } from "Behaviors/getEnergyFromLink";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { franchiseIncomePerTick } from "Selectors/franchiseIncomePerTick";
import { getHeadquarterLogisticsLocation } from "Selectors/getHqLocations";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { officeResourceSurplus } from "Selectors/officeResourceSurplus";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
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
    energyValue(office: string) {
        return -minionCostPerTick(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office)));
    }
    spawn() {
        for (let office in Memory.offices) {
            // Only needed if we have central HQ structures
            const hq = roomPlans(office)?.headquarters;
            if (!(hq?.terminal.structure || hq?.link.structure || hq?.factory.structure)) {
                return;
            }

            if (franchiseIncomePerTick(office) <= 0 ) return; // Only spawn logistics minions if we have active Franchises

            // Maintain one max-sized Accountant
            if (!this.assigned.map(byId).some(c => c?.memory.office === office)) {
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
        const terminalEnergySurplus = (officeResourceSurplus(creep.memory.office).get(RESOURCE_ENERGY) ?? 0)
        const terminal = hq.terminal.structure
        const storage = hq.storage.structure;
        let gotEnergy = false;

        if (getEnergyFromLink(creep) === BehaviorResult.SUCCESS) {
            gotEnergy = true;
        }

        if (terminal && terminalEnergySurplus > 0) {
            creep.withdraw(terminal, RESOURCE_ENERGY, terminalEnergySurplus);
        }

        if (terminal && terminalEnergySurplus < 0) {
            // Deposit in terminal, if it needs it, or get energy from storage if we need to
            if (creepEnergy > 0) {
                creep.transfer(terminal, RESOURCE_ENERGY, Math.max(Math.abs(terminalEnergySurplus), creepEnergy))
            } else if (!gotEnergy && storage) {
                creep.withdraw(storage, RESOURCE_ENERGY, Math.max(Math.abs(terminalEnergySurplus), creepEnergy))
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
