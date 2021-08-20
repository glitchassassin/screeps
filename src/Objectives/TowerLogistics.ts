import { BehaviorResult } from "Behaviors/Behavior";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { setState, States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { getTowerRefillerLocation } from "Selectors/getHqLocations";
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
 * Picks up energy from Storage and transfers it to Towers
 */
export class TowerLogisticsObjective extends Objective {
    energyValue(office: string) {
        return -minionCostPerTick(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 3));
    }
    spawn() {
        for (let office in Memory.offices) {
            const hq = roomPlans(office)?.headquarters;
            const towersNeedRefilled = (hq?.towers.reduce((sum, t) => sum + ((t.structure as StructureTower)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0), 0) ?? 0) > 0
            if (!towersNeedRefilled) {
                continue
            }
            if (storageEnergyAvailable(office) === 0) continue; // Only spawn refillers if we have energy available

            // Maintain one small Accountant to fill towers
            let preferredSpace = getTowerRefillerLocation(office);
            if (!this.minions(office)) {
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office), 3)
                )({
                    preferredSpawn: hq?.spawn.structure as StructureSpawn,
                    preferredSpaces: preferredSpace ? [preferredSpace] : undefined,
                    allowOtherSpaces: false
                })
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
            const tower = hq.towers.find(t => ((t.structure as StructureTower)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0);
            if (tower?.structure && moveTo(tower?.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                creep.transfer(tower.structure, RESOURCE_ENERGY);
            }
        }
    }
}

profiler.registerClass(TowerLogisticsObjective, 'TowerLogisticsObjective')
