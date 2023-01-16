import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { buildAccountant } from 'Minions/Builds/accountant';
import { MinionTypes } from 'Minions/minionTypes';
import { fixedCount } from 'Missions/BaseClasses';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { MultiMissionSpawner } from 'Missions/BaseClasses/MissionSpawner/MultiMissionSpawner';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { sum } from 'Selectors/reducers';
import { roomPlans } from 'Selectors/roomPlans';
import { unpackPos } from 'utils/packrat';
import { PowerBankDuoMission } from './PowerBankDuoMission';

export interface PowerBankMissionData extends BaseMissionData {
  powerBank: Id<StructurePowerBank>;
  powerBankPos: string;
  duosSpawned?: number;
  powerToRetrieve?: number;
  powerRetrieved?: number;
}

export class PowerBankMission extends MissionImplementation {
  budget = Budget.SURPLUS;
  public creeps = {
    haulers: new MultiCreepSpawner(
      'h',
      this.missionData.office,
      {
        role: MinionTypes.ACCOUNTANT,
        builds: energy => buildAccountant(energy, 25, false, false),
        count: fixedCount(() => {
          // wait to spawn until duos are about to crack the bank
          if (!this.willBreachIn(750)) {
            return 0;
          }
          // spawn enough to haul all the power in one trip
          return Math.ceil((this.report()?.amount ?? 0) / (25 * CARRY_CAPACITY));
        })
      },
      { onSpawn: creep => this.recordCreepEnergy(creep) }
    )
  };

  public missions = {
    duos: new MultiMissionSpawner(
      PowerBankDuoMission,
      current => {
        const duosCount = this.report()?.duoCount ?? 1; // if boosted, only needs one
        if (
          current.length >= (this.report()?.adjacentSquares ?? 0) ||
          current.some(d => !d.assembled()) ||
          current.length >= duosCount
        ) {
          return []; // enough missions already
        }
        const analysis = PowerBankDuoMission.costAnalysis(this.missionData.office, this.report()!);

        // console.log(JSON.stringify(analysis));

        if (analysis.bestTier === undefined) {
          return []; // no viable builds
        }
        return [{ ...this.missionData, boostTier: analysis.bestTier }];
      },
      mission => {
        this.recordMissionEnergy(mission);
        this.missionData.duosSpawned = (this.missionData.duosSpawned ?? 0) + 1;
      }
    )
  };

  priority = 6;

  constructor(public missionData: PowerBankMissionData, id?: string) {
    super(missionData, id);

    // calculate energy needed for mission
    const powerCost = this.report()?.powerCost;
    const amount = this.report()?.amount;
    if (powerCost && amount) {
      this.estimatedEnergyRemaining ??= powerCost * amount;
      missionData.powerToRetrieve = amount;
    } else {
      console.log('Unable to fetch report for powerbank mission', unpackPos(missionData.powerBankPos));
      this.status = MissionStatus.DONE;
    }
  }
  static fromId(id: PowerBankMission['id']) {
    return super.fromId(id) as PowerBankMission;
  }

  onStart() {
    super.onStart();
    console.log('[PowerBankMission] started targeting', unpackPos(this.missionData.powerBankPos));
  }

  onEnd() {
    super.onEnd();
    console.log('[PowerBankMission] finished in', unpackPos(this.missionData.powerBankPos));
    if (this.missionData.powerToRetrieve) {
      const retrieved = this.missionData.powerRetrieved ?? 0;
      const percent = (retrieved / this.missionData.powerToRetrieve) * 100;
      console.log(`[PowerBankMission] retrieved ${retrieved} of ${this.missionData.powerToRetrieve} (${percent}%)`);
    }
  }

  report() {
    return Memory.offices[this.missionData.office].powerbanks.find(p => p.id === this.missionData.powerBank);
  }

  willBreachIn(ticks: number) {
    const hits = this.report()?.hits ?? 0;
    const damage = this.missions.duos.resolved.map(m => m.actualDamageRemaining(ticks)).reduce(sum, 0);
    return damage >= hits;
  }

  run(
    creeps: ResolvedCreeps<PowerBankMission>,
    missions: ResolvedMissions<PowerBankMission>,
    data: PowerBankMissionData
  ) {
    const { haulers } = creeps;

    // short circuit
    if ((this.report()?.expires ?? 0) - Game.time < 1800 && this.report()?.hits === POWER_BANK_HITS) {
      // less than 1800 ticks to decay and no damage done yet, abandon
      this.status = MissionStatus.DONE;
      return;
    }

    if (!this.report() && !haulers.length) {
      this.status = MissionStatus.DONE;
    }

    const powerBankPos = unpackPos(data.powerBankPos);
    const powerBankRuin = Game.rooms[powerBankPos.roomName]
      ? powerBankPos.lookFor(LOOK_RUINS).find(s => s.structure.structureType === STRUCTURE_POWER_BANK)
      : undefined;
    const powerBankResources = Game.rooms[powerBankPos.roomName]
      ? powerBankPos.lookFor(LOOK_RESOURCES).find(s => s.resourceType === RESOURCE_POWER)
      : undefined;
    const terminal = roomPlans(data.office)?.headquarters?.terminal.structure;

    for (const hauler of haulers) {
      runStates(
        {
          [States.WITHDRAW]: (mission, creep) => {
            if (
              creep.store.getUsedCapacity(RESOURCE_POWER) ||
              (Game.rooms[powerBankPos.roomName] &&
                !byId(this.report()?.id) &&
                !powerBankRuin &&
                !Game.rooms[powerBankPos.roomName].find(FIND_DROPPED_RESOURCES, { filter: RESOURCE_POWER }).length)
            ) {
              return States.DEPOSIT;
            }
            if (powerBankRuin) {
              moveTo(creep, powerBankRuin);
              creep.withdraw(powerBankRuin, RESOURCE_POWER);
            } else if (powerBankResources) {
              moveTo(creep, powerBankResources);
              creep.pickup(powerBankResources);
            } else {
              moveTo(creep, { pos: powerBankPos, range: 3 }, { visualizePathStyle: {} });
            }
            Game.map.visual.line(creep.pos, powerBankPos);
            return States.WITHDRAW;
          },
          [States.DEPOSIT]: (mission, creep) => {
            if (!creep.store.getUsedCapacity(RESOURCE_POWER) || !terminal) return States.RECYCLE;
            moveTo(creep, terminal);
            const result = creep.transfer(terminal, RESOURCE_POWER);
            if (result === OK) {
              data.powerRetrieved ??= 0;
              data.powerRetrieved += Math.min(
                creep.store.getUsedCapacity(RESOURCE_POWER),
                terminal.store.getFreeCapacity(RESOURCE_POWER)
              );
            }
            return States.DEPOSIT;
          },
          [States.RECYCLE]: recycle
        },
        this.missionData,
        hauler
      );
    }
  }
}
