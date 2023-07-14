import { buildClerk } from 'Minions/Builds/clerk';
import { MinionTypes } from 'Minions/minionTypes';
import { ConditionalCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/ConditionalCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { move, moveTo } from 'screeps-cartographer';
import { getHeadquarterLogisticsLocation } from 'Selectors/getHqLocations';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { defaultRoomCallback } from 'Selectors/Map/Pathing';
import { roomPlans } from 'Selectors/roomPlans';

export interface HQLogisticsMissionData extends BaseMissionData {}

export class HQLogisticsMission extends MissionImplementation {
  public creeps = {
    clerk: new ConditionalCreepSpawner('x', this.missionData.office, {
      role: MinionTypes.CLERK,
      budget: Budget.ESSENTIAL,
      builds: energy => buildClerk(energy, undefined, true),
      shouldSpawn: () => hasEnergyIncome(this.missionData.office),
      estimatedCpuPerTick: 0.6
    })
  };

  priority = 15;
  initialEstimatedCpuOverhead = 0.5

  constructor(public missionData: HQLogisticsMissionData, id?: string) {
    super(missionData, id);
    this.setPriority();
  }
  static fromId(id: HQLogisticsMission['id']) {
    return super.fromId(id) as HQLogisticsMission;
  }

  onStart(): void {
    super.onStart();
  }

  setPriority() {
    const plans = roomPlans(this.missionData.office);
    if (plans?.headquarters?.link.structure && plans.fastfiller?.link.structure) {
      this.priority = 15; // key to keeping fastfiller running
    } else {
      this.priority = 9; // keeps upgrading going
    }
  }

  run(
    creeps: ResolvedCreeps<HQLogisticsMission>,
    missions: ResolvedMissions<HQLogisticsMission>,
    data: HQLogisticsMissionData
  ) {
    this.setPriority();
    const { clerk } = creeps;
    if (!clerk) return;

    // Priorities:
    // Link -> Storage
    // Storage <-> Terminal (energy)
    // If link has energy, GET_ENERGY_LINK and DEPOSIT_STORAGE

    const pos = getHeadquarterLogisticsLocation(data.office);
    if (!pos) return;

    this.logCpu("overhead")

    if (!clerk.pos.isEqualTo(pos)) {
      moveTo(clerk, { pos, range: 0 }, { roomCallback: defaultRoomCallback({ ignoreHQLogistics: true }) });
      return;
    }
    move(clerk, [pos], 10); // maintain position

    this.logCpu("creeps")

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
      ((fastfiller?.link.structure as StructureLink)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) >
        LINK_CAPACITY / 2 ||
      ((library?.link.structure as StructureLink)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > LINK_CAPACITY / 2;
    const linkAmountToTransfer = destinationLinkFreeSpace ? LINK_CAPACITY - linkAmountAvailable : -linkAmountAvailable;

    let withdraw = false;
    let transfer = false;

    const powerSpawnPowerNeeded = powerSpawn ? powerSpawn.store.getFreeCapacity(RESOURCE_POWER) : 0;

    this.logCpu("overhead");

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

    if (terminal && terminalAmountNeeded) {
      if (terminalAmountNeeded > 0 && !transfer) {
        const amount = Math.min(terminalAmountNeeded, clerk.store.getUsedCapacity(RESOURCE_ENERGY));
        clerk.transfer(terminal, RESOURCE_ENERGY, amount);
        transfer = true;
        creepEnergy -= amount;
      } else if (terminalAmountNeeded < 0 && !withdraw) {
        const amount = Math.min(-terminalAmountNeeded, clerk.store.getFreeCapacity(RESOURCE_ENERGY));
        clerk.withdraw(terminal, RESOURCE_ENERGY, amount);
        withdraw = true;
        creepEnergy += amount;
      }
    }

    if (extension && extensionAmountNeeded && extensionAmountNeeded > 0 && !transfer) {
      const amount = Math.min(extensionAmountNeeded, clerk.store.getUsedCapacity(RESOURCE_ENERGY));
      clerk.transfer(extension, RESOURCE_ENERGY, amount);
      transfer = true;
      creepEnergy -= amount;
    }

    // Power spawn
    if (powerSpawn && powerSpawnPowerNeeded > 50 && terminal?.store.getUsedCapacity(RESOURCE_POWER)) {
      const amountToWithdraw = Math.min(
        powerSpawnPowerNeeded - clerk.store.getUsedCapacity(RESOURCE_POWER),
        terminal.store.getUsedCapacity(RESOURCE_POWER),
        clerk.store.getFreeCapacity(RESOURCE_POWER)
      );
      if (!withdraw && amountToWithdraw) {
        clerk.withdraw(terminal, RESOURCE_POWER, amountToWithdraw);
        withdraw = true;
      }
      if (!transfer && clerk.store.getUsedCapacity(RESOURCE_POWER)) {
        clerk.transfer(powerSpawn, RESOURCE_POWER);
        transfer = true;
      }
    }
    if (!transfer && powerSpawn && powerSpawnAmountNeeded && powerSpawnAmountNeeded > 0) {
      const amount = Math.min(powerSpawnAmountNeeded, clerk.store.getUsedCapacity(RESOURCE_ENERGY));
      clerk.transfer(powerSpawn, RESOURCE_ENERGY, amount);
      transfer = true;
      creepEnergy -= amount;
    }

    if (!withdraw && storage && creepEnergy < clerk.store.getCapacity() / 2) {
      clerk.withdraw(storage, RESOURCE_ENERGY);
      withdraw = true;
    } else if (!transfer && storage && creepEnergy > clerk.store.getCapacity() / 2) {
      const amount = creepEnergy - clerk.store.getCapacity() / 2;
      clerk.transfer(storage, RESOURCE_ENERGY, amount);
      transfer = true;
    }

    this.logCpu("creeps");
  }
}
