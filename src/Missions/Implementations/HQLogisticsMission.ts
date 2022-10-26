import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { getHeadquarterLogisticsLocation } from 'Selectors/getHqLocations';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { defaultRoomCallback } from 'Selectors/Map/Pathing';
import { roomPlans } from 'Selectors/roomPlans';

export interface HQLogisticsMissionData extends BaseMissionData {}

export class HQLogisticsMission extends MissionImplementation {
  public creeps = {
    clerk: new CreepSpawner('x', this.missionData.office, {
      role: MinionTypes.CLERK,
      budget: Budget.ESSENTIAL,
      body: energy => MinionBuilders[MinionTypes.CLERK](energy),
      respawn: () => hasEnergyIncome(this.missionData.office)
    })
  };

  priority = 15;

  constructor(public missionData: HQLogisticsMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: HQLogisticsMission['id']) {
    return super.fromId(id) as HQLogisticsMission;
  }

  onStart(): void {
    super.onStart();
  }

  run(
    creeps: ResolvedCreeps<HQLogisticsMission>,
    missions: ResolvedMissions<HQLogisticsMission>,
    data: HQLogisticsMissionData
  ) {
    const { clerk } = creeps;

    if (!clerk) return;

    // Priorities:
    // Link -> Storage
    // Storage <-> Terminal (energy)
    // If link has energy, GET_ENERGY_LINK and DEPOSIT_STORAGE

    const pos = getHeadquarterLogisticsLocation(data.office);
    if (!pos) return;
    moveTo(clerk, { pos, range: 0 }, { roomCallback: defaultRoomCallback({ ignoreHQLogistics: true }) });

    // Check HQ state
    const hq = roomPlans(data.office)?.headquarters;
    const fastfiller = roomPlans(data.office)?.fastfiller;
    const library = roomPlans(data.office)?.library;
    if (!hq) return;
    let creepEnergy = clerk.store.getUsedCapacity(RESOURCE_ENERGY);
    const terminal = hq.terminal.structure as StructureTerminal | undefined;
    const storage = hq.storage.structure as StructureStorage | undefined;
    const link = hq.link.structure as StructureLink | undefined;
    const extension = hq.extension.structure as StructureExtension | undefined;
    const powerSpawn = hq.powerSpawn.structure as StructurePowerSpawn | undefined;

    const terminalAmountNeeded = terminal ? 30000 - terminal.store.getUsedCapacity(RESOURCE_ENERGY) : 0;
    const extensionAmountNeeded = extension ? extension.store.getFreeCapacity(RESOURCE_ENERGY) : 0;
    const powerSpawnAmountNeeded = powerSpawn ? powerSpawn.store.getFreeCapacity(RESOURCE_ENERGY) : 0;
    const linkAmountAvailable = link?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0;
    const destinationLinkFreeSpace =
      ((fastfiller?.link.structure as StructureLink)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) +
      ((library?.link.structure as StructureLink)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0);
    const linkAmountToTransfer = destinationLinkFreeSpace ? LINK_CAPACITY - linkAmountAvailable : 0;

    let withdraw = false;
    let transfer = false;

    const powerSpawnPowerNeeded = powerSpawn ? powerSpawn.store.getFreeCapacity(RESOURCE_POWER) : 0;

    // Emergency provision for over-full Storage
    if (storage && storage.store.getFreeCapacity() < 5000) {
      !withdraw && clerk.withdraw(storage, RESOURCE_ENERGY);
      withdraw = true;
      if (clerk.drop(RESOURCE_ENERGY) === OK) {
        this.recordEnergy(clerk.store.getUsedCapacity(RESOURCE_ENERGY));
      }
      return;
    }

    // First, try to balance link
    if (link && linkAmountToTransfer < 0) {
      !withdraw &&
        clerk.withdraw(link, RESOURCE_ENERGY, Math.min(clerk.store.getFreeCapacity(), Math.abs(linkAmountToTransfer)));
      withdraw = true;
      creepEnergy += Math.abs(linkAmountToTransfer);
      // console.log(clerk.name, 'withdrawing', linkAmountAvailable, 'from link')
    } else if (link && linkAmountToTransfer > 0) {
      !transfer &&
        clerk.transfer(
          link,
          RESOURCE_ENERGY,
          Math.min(clerk.store.getUsedCapacity(RESOURCE_ENERGY), Math.abs(linkAmountToTransfer))
        );
      transfer = true;
      creepEnergy -= Math.abs(linkAmountToTransfer);
    }

    if (terminal && terminalAmountNeeded && terminalAmountNeeded > 0) {
      const amount = Math.min(terminalAmountNeeded, clerk.store.getUsedCapacity(RESOURCE_ENERGY));
      !transfer && clerk.transfer(terminal, RESOURCE_ENERGY, amount);
      transfer = true;
      creepEnergy -= amount;
      // console.log(clerk.name, 'transferring', amount, 'to terminal')
    }

    if (extension && extensionAmountNeeded && extensionAmountNeeded > 0) {
      const amount = Math.min(extensionAmountNeeded, clerk.store.getUsedCapacity(RESOURCE_ENERGY));
      !transfer && clerk.transfer(extension, RESOURCE_ENERGY, amount);
      transfer = true;
      creepEnergy -= amount;
      // console.log(clerk.name, 'transferring', amount, 'to extension')
    }

    // Power spawn
    if (powerSpawn && powerSpawnPowerNeeded > 50 && terminal?.store.getUsedCapacity(RESOURCE_POWER)) {
      const amountToWithdraw = Math.min(
        powerSpawnPowerNeeded - clerk.store.getUsedCapacity(RESOURCE_POWER),
        terminal.store.getUsedCapacity(RESOURCE_POWER),
        clerk.store.getFreeCapacity(RESOURCE_POWER)
      );
      if (amountToWithdraw) {
        !withdraw && clerk.withdraw(terminal, RESOURCE_POWER, amountToWithdraw);
        withdraw = true;
      }
      if (clerk.store.getUsedCapacity(RESOURCE_POWER)) {
        !transfer && clerk.transfer(powerSpawn, RESOURCE_POWER);
        transfer = true;
      }
    }
    if (powerSpawn && powerSpawnAmountNeeded && powerSpawnAmountNeeded > 0) {
      const amount = Math.min(powerSpawnAmountNeeded, clerk.store.getUsedCapacity(RESOURCE_ENERGY));
      !transfer && clerk.transfer(powerSpawn, RESOURCE_ENERGY, amount);
      transfer = true;
      creepEnergy -= amount;
      // console.log(clerk.name, 'transferring', amount, 'to extension')
    }

    if (storage && creepEnergy < clerk.store.getCapacity() / 2) {
      !withdraw && clerk.withdraw(storage, RESOURCE_ENERGY);
      withdraw = true;
      // console.log(clerk.name, 'withdrawing extra from storage')
    } else if (storage && creepEnergy > clerk.store.getCapacity() / 2) {
      const amount = creepEnergy - clerk.store.getCapacity() / 2;
      !transfer && clerk.transfer(storage, RESOURCE_ENERGY, amount);
      transfer = true;
      // console.log(clerk.name, 'transferring', amount, 'to storage')
    }
  }
}
