import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { getHeadquarterLogisticsLocation } from "Selectors/getHqLocations";
import { minionCost } from "Selectors/minionCostPerTick";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

export interface HQLogisticsMission extends Mission<MissionType.HQ_LOGISTICS> {
  data: {}
}

export function createHQLogisticsMission(office: string, startTime?: number): HQLogisticsMission {
  const body = MinionBuilders[MinionTypes.CLERK](spawnEnergyAvailable(office));

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body),
  }

  return createMission({
    office,
    priority: 15,
    type: MissionType.HQ_LOGISTICS,
    data: {},
    estimate,
    startTime
  })
}

export class HQLogistics extends MissionImplementation {
  static spawn(mission: HQLogisticsMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    const pos = getHeadquarterLogisticsLocation(mission.office);
    const spawn = roomPlans(mission.office)?.headquarters?.spawn.structure as StructureSpawn;

    if (!pos || !spawn) return;

    const body = MinionBuilders[MinionTypes.CLERK](spawnEnergyAvailable(mission.office));

    // Set name
    const name = `CLERK-${mission.office}-${Game.time % 10000}-${Math.floor(Math.random() * 100)}`

    scheduleSpawn(
      mission.office,
      mission.priority,
      {
        name,
        body,
      },
      mission.startTime,
      mission.startTime ? {
        spawn: spawn.id,
        directions: [spawn.pos.getDirectionTo(pos)]
      } : undefined
    )

    mission.creepNames.push(name);
  }

  static minionLogic(mission: HQLogisticsMission, creep: Creep): void {
    // Priorities:
    // Link -> Storage
    // Storage <-> Terminal (energy)
    // If link has energy, GET_ENERGY_LINK and DEPOSIT_STORAGE

    // Check HQ state
    const hq = roomPlans(mission.office)?.headquarters;
    if (!hq) return;
    let creepEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
    const terminal = hq.terminal.structure as StructureTerminal | undefined;
    const storage = hq.storage.structure as StructureStorage | undefined;
    const spawn = hq.spawn.structure as StructureSpawn | undefined;
    const link = hq.link.structure as StructureLink | undefined;

    const terminalAmountNeeded = terminal ? 30000 - terminal.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
    const spawnAmountNeeded = spawn?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0;
    const linkAmountAvailable = link?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0;

    // Emergency provision for over-full Storage
    if (storage && storage.store.getFreeCapacity() < 5000) {
      creep.withdraw(storage, RESOURCE_ENERGY);
      if (creep.drop(RESOURCE_ENERGY) === OK) {
        mission.actual.energy += creep.store.getUsedCapacity(RESOURCE_ENERGY);
      }
      return;
    }

    // First, try to get energy from link
    if (link && linkAmountAvailable > 0) {
      creep.withdraw(link, RESOURCE_ENERGY);
      creepEnergy += linkAmountAvailable;
      // console.log(creep.name, 'withdrawing', linkAmountAvailable, 'from link')
    }

    // Balance energy from Storage to Terminal
    // If storage pressure is higher AND we have no energy, withdraw from storage just enough to correct the imbalance (if more than threshold)
    // If terminal pressure is higher AND we have no energy, withdraw from terminal just enough to correct the imbalance

    if (spawn && spawnAmountNeeded > 0) {
      const amount = Math.min(spawnAmountNeeded, creep.store.getUsedCapacity());
      creep.transfer(spawn, RESOURCE_ENERGY, amount);
      creepEnergy -= amount;
      // console.log(creep.name, 'transferring', amount, 'to spawn')
    }

    if (terminal && terminalAmountNeeded && terminalAmountNeeded > 0) {
      const amount = Math.min(terminalAmountNeeded, creep.store.getUsedCapacity());
      creep.transfer(terminal, RESOURCE_ENERGY, amount);
      creepEnergy -= amount;
      // console.log(creep.name, 'transferring', amount, 'to terminal')
    }

    if (storage && creepEnergy < creep.store.getCapacity()) {
      creep.withdraw(storage, RESOURCE_ENERGY);
      // console.log(creep.name, 'withdrawing extra from storage')
    } else if (storage && creepEnergy > creep.store.getCapacity()) {
      const amount = creepEnergy - creep.store.getCapacity();
      creep.transfer(storage, RESOURCE_ENERGY, amount);
      // console.log(creep.name, 'transferring', amount, 'to storage')
    }
  }
}
