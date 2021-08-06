import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromLink } from "Behaviors/getEnergyFromLink";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes, spawnMinion } from "Minions/minionTypes";
import { byId } from "Selectors/byId";
import { isPositionWalkable } from "Selectors/MapCoordinates";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { profitPerTick } from "Selectors/profitPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
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
    spawn(office: string, spawns: StructureSpawn[]) {
        // Only needed if we have central HQ structures
        const hq = roomPlans(office)?.office?.headquarters;
        if (!(hq?.towers.some(t => t.structure) || hq?.container.structure || hq?.link.structure)) {
            return 0;
        }

        if (profitPerTick(office) <= 0) return 0; // Only spawn logistics minions if we have active Franchises

        let spawnQueue = [];

        // Maintain one max-sized Accountant
        if (!this.assigned.map(byId).some(c => c?.memory.office === office)) {
            spawnQueue.push(spawnMinion(
                office,
                this.id,
                MinionTypes.ACCOUNTANT,
                MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))
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
        // Priorities:
        // Link -> Storage
        // Storage -> Towers
        // Storage -> Legal
        // If link has energy, GET_ENERGY_LINK and DEPOSIT_STORAGE
        // If towers need refilled, GET_ENERGY_STORAGE and FILL_TOWERS
        // If legal needs refilled, GET_ENERGY_STORAGE and FILL_LEGAL

        // If creep is empty, get energy from link
        // If that fails and towers or legal need refilled, get energy from storage
        // If creep is full and towers need refilled, fill towers
        // Else if legal needs refilled, refill legal
        // Else deposit in storage

        // Check HQ state
        const hq = roomPlans(creep.memory.office)?.office?.headquarters;
        if (!hq) return;
        const creepIsEmpty = creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
        const towersNeedRefilled = hq.towers.reduce((sum, t) => sum + ((t.structure as StructureTower)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0), 0) > 0
        const legalNeedsRefilled = ((hq.container.structure as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0

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
                if (towersNeedRefilled) {
                    setState(States.FILL_TOWERS)(creep);
                } else if (legalNeedsRefilled) {
                    setState(States.FILL_LEGAL)(creep);
                } else {
                    setState(States.DEPOSIT)(creep);
                }
            } else if (result === BehaviorResult.FAILURE) {
                if (towersNeedRefilled || legalNeedsRefilled) {
                    setState(States.GET_ENERGY_STORAGE)(creep);
                } else {
                    setState(States.DEPOSIT)(creep);
                }
            }
        }
        if (creep.memory.state === States.GET_ENERGY_STORAGE) {
            const result = getEnergyFromStorage(creep)
            if (result === BehaviorResult.SUCCESS) {
                if (towersNeedRefilled) {
                    setState(States.FILL_TOWERS)(creep);
                } else if (legalNeedsRefilled) {
                    setState(States.FILL_LEGAL)(creep);
                } else {
                    setState(States.DEPOSIT)(creep);
                }
            } else if (result === BehaviorResult.FAILURE) {
                if (towersNeedRefilled || legalNeedsRefilled) {
                    setState(States.GET_ENERGY_LINK)(creep);
                    return;
                }
            }
        }
        if (creep.memory.state === States.FILL_TOWERS) {
            if (creepIsEmpty) {
                setState(States.GET_ENERGY_LINK)(creep);
                return;
            }
            const tower = hq.towers.find(t => ((t.structure as StructureTower)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0);
            if (!tower || !tower.structure) {
                setState(States.GET_ENERGY_LINK)(creep);
            } else if (moveTo(tower?.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                creep.transfer(tower.structure, RESOURCE_ENERGY);
            }
        }
        if (creep.memory.state === States.FILL_LEGAL) {
            if (creepIsEmpty) {
                setState(States.GET_ENERGY_LINK)(creep);
                return;
            }
            const container = hq.container;
            if (!legalNeedsRefilled || !container.structure) {
                setState(States.GET_ENERGY_LINK)(creep);
            } else if (moveTo(container?.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                creep.transfer(container.structure, RESOURCE_ENERGY);
            }
        }
        if (creep.memory.state === States.DEPOSIT) {
            if (creepIsEmpty) {
                setState(States.GET_ENERGY_LINK)(creep);
                return;
            }
            const storage = roomPlans(creep.memory.office)?.office?.headquarters.storage;
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

