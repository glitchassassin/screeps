import { moveTo } from 'Behaviors/moveTo';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { getHeadquarterLogisticsLocation } from 'Selectors/getHqLocations';
import { minionCost } from 'Selectors/minionCostPerTick';
import { roomPlans } from 'Selectors/roomPlans';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

export interface HQLogisticsMission extends Mission<MissionType.HQ_LOGISTICS> {
  data: {};
}

export function createHQLogisticsMission(office: string, startTime?: number): HQLogisticsMission {
  const body = MinionBuilders[MinionTypes.CLERK](spawnEnergyAvailable(office));

  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body)
  };

  return createMission({
    office,
    priority: 15,
    type: MissionType.HQ_LOGISTICS,
    data: {},
    estimate,
    startTime
  });
}

export class HQLogistics extends MissionImplementation {
  static spawn(mission: HQLogisticsMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    const pos = getHeadquarterLogisticsLocation(mission.office);

    if (!pos) return;

    const body = MinionBuilders[MinionTypes.CLERK](spawnEnergyAvailable(mission.office), 800 / CARRY_CAPACITY, true);

    // Set name
    const name = `CLERK-${mission.office}-${mission.id}`;

    scheduleSpawn(
      mission.office,
      mission.priority,
      {
        name,
        body
      },
      mission.startTime
    );

    mission.creepNames.push(name);
  }

  static minionLogic(mission: HQLogisticsMission, creep: Creep): void {
    // Priorities:
    // Link -> Storage
    // Storage <-> Terminal (energy)
    // If link has energy, GET_ENERGY_LINK and DEPOSIT_STORAGE

    const pos = getHeadquarterLogisticsLocation(mission.office);
    if (!pos) return;
    moveTo(creep, pos, { ignoreHQLogistics: true });

    // Check HQ state
    const hq = roomPlans(mission.office)?.headquarters;
    if (!hq) return;
    let creepEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
    const terminal = hq.terminal.structure as StructureTerminal | undefined;
    const storage = hq.storage.structure as StructureStorage | undefined;
    const link = hq.link.structure as StructureLink | undefined;
    const extension = hq.extension.structure as StructureExtension | undefined;

    const terminalAmountNeeded = terminal ? 30000 - terminal.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
    const extensionAmountNeeded = extension ? extension.store.getFreeCapacity(RESOURCE_ENERGY) : 0;
    const linkAmountAvailable = link?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0;
    const linkAmountToTransfer = LINK_CAPACITY / 2 - linkAmountAvailable;

    let withdraw = false;
    let transfer = false;

    // Emergency provision for over-full Storage
    if (storage && storage.store.getFreeCapacity() < 5000) {
      !withdraw && creep.withdraw(storage, RESOURCE_ENERGY);
      withdraw = true;
      if (creep.drop(RESOURCE_ENERGY) === OK) {
        mission.actual.energy += creep.store.getUsedCapacity(RESOURCE_ENERGY);
      }
      return;
    }

    // First, try to balance link
    if (link && linkAmountToTransfer < 0) {
      !withdraw &&
        creep.withdraw(link, RESOURCE_ENERGY, Math.min(creep.store.getFreeCapacity(), Math.abs(linkAmountToTransfer)));
      withdraw = true;
      creepEnergy += Math.abs(linkAmountToTransfer);
      // console.log(creep.name, 'withdrawing', linkAmountAvailable, 'from link')
    } else if (link && linkAmountToTransfer > 0) {
      !transfer &&
        creep.transfer(link, RESOURCE_ENERGY, Math.min(creep.store.getUsedCapacity(), Math.abs(linkAmountToTransfer)));
      transfer = true;
      creepEnergy -= Math.abs(linkAmountToTransfer);
    }

    if (terminal && terminalAmountNeeded && terminalAmountNeeded > 0) {
      const amount = Math.min(terminalAmountNeeded, creep.store.getUsedCapacity());
      !transfer && creep.transfer(terminal, RESOURCE_ENERGY, amount);
      transfer = true;
      creepEnergy -= amount;
      // console.log(creep.name, 'transferring', amount, 'to terminal')
    }

    if (extension && extensionAmountNeeded && extensionAmountNeeded > 0) {
      const amount = Math.min(extensionAmountNeeded, creep.store.getUsedCapacity());
      !transfer && creep.transfer(extension, RESOURCE_ENERGY, amount);
      transfer = true;
      creepEnergy -= amount;
      // console.log(creep.name, 'transferring', amount, 'to extension')
    }

    if (storage && creepEnergy < creep.store.getCapacity()) {
      !withdraw && creep.withdraw(storage, RESOURCE_ENERGY);
      withdraw = true;
      // console.log(creep.name, 'withdrawing extra from storage')
    } else if (storage && creepEnergy > creep.store.getCapacity()) {
      const amount = creepEnergy - creep.store.getCapacity();
      !transfer && creep.transfer(storage, RESOURCE_ENERGY, amount);
      transfer = true;
      // console.log(creep.name, 'transferring', amount, 'to storage')
    }
  }
}
