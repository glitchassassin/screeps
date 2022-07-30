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
    moveTo(creep, pos);

    // Check HQ state
    const hq = roomPlans(mission.office)?.headquarters;
    if (!hq) return;
    let creepEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY);
    const terminal = hq.terminal.structure as StructureTerminal | undefined;
    const storage = hq.storage.structure as StructureStorage | undefined;
    const link = hq.link.structure as StructureLink | undefined;

    const terminalAmountNeeded = terminal ? 30000 - terminal.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
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
