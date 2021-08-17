import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromLink } from "Behaviors/getEnergyFromLink";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { franchiseIncomePerTick } from "Selectors/franchiseIncomePerTick";
import { getHeadquarterLogisticsLocation } from "Selectors/getHqLocations";
import { isPositionWalkable } from "Selectors/MapCoordinates";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
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
        // If link has energy, GET_ENERGY_LINK and DEPOSIT_STORAGE

        // Check HQ state
        const hq = roomPlans(creep.memory.office)?.headquarters;
        if (!hq) return;
        const creepIsEmpty = creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;

        if (!creep.memory.state) {
            if (creepIsEmpty) {
                setState(States.GET_ENERGY_LINK)(creep);
            } else {
                setState(States.DEPOSIT)(creep);
            }
        }
        if (creep.memory.state === States.GET_ENERGY_LINK) {
            const result = getEnergyFromLink(creep)
            if (result === BehaviorResult.SUCCESS) {
                setState(States.DEPOSIT)(creep);
            }
        }
        if (creep.memory.state === States.DEPOSIT) {
            if (creepIsEmpty) {
                setState(States.GET_ENERGY_LINK)(creep);
                return;
            }
            const storage = roomPlans(creep.memory.office)?.headquarters?.storage;
            if (!storage) return;
            if (storage.structure) {
                moveTo(storage.pos, 1)(creep);
                if (creep.transfer(storage.structure, RESOURCE_ENERGY) === OK) {
                    setState(States.GET_ENERGY_LINK)(creep);
                }
            } else if (isPositionWalkable(storage.pos)) {
                // Drop at storage position
                if (moveTo(storage.pos, 0)(creep) === BehaviorResult.SUCCESS) {
                    creep.drop(RESOURCE_ENERGY);
                    setState(States.GET_ENERGY_LINK)(creep);
                }
            } else {
                // Drop next to storage under construction
                if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.drop(RESOURCE_ENERGY);
                    setState(States.GET_ENERGY_LINK)(creep);
                }
            }
        }
    }
}

profiler.registerClass(HeadquartersLogisticsObjective, 'HeadquartersLogisticsObjective')
