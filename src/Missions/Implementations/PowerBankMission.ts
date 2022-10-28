import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
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
import { roomPlans } from 'Selectors/roomPlans';
import { unpackPos } from 'utils/packrat';
import { PowerBankDuoMission } from './PowerBankDuoMission';

export interface PowerBankMissionData extends BaseMissionData {
  powerBank: Id<StructurePowerBank>;
  powerBankPos: string;
}

export class PowerBankMission extends MissionImplementation {
  public creeps = {
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.ACCOUNTANT](energy, 25, false, false),
      count: fixedCount(() => {
        // wait to spawn until duos are about to crack the bank
        const totalDamage = this.missions.duos.resolved.reduce((sum, d) => sum + (d?.damagePerTick() ?? 0), 0) * 750; // damage over next 750 ticks
        if (totalDamage < (this.report()?.hits ?? Infinity)) {
          return 0;
        }
        // spawn enough to haul all the power in one trip
        return Math.ceil((this.report()?.amount ?? 0) / (25 * CARRY_CAPACITY));
      })
    })
  };

  public missions = {
    duos: new MultiMissionSpawner(PowerBankDuoMission, current => {
      const totalDamage = current.reduce((sum, d) => sum + (d?.damageRemaining() ?? 0), 0);
      if (
        current.length < (this.report()?.adjacentSquares ?? 0) &&
        current.every(d => d.assembled()) &&
        totalDamage < (this.report()?.hits ?? 0)
      ) {
        return [this.missionData];
      }
      return [];
    })
  };

  priority = 8;

  constructor(public missionData: PowerBankMissionData, id?: string) {
    super(missionData, id);
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
  }

  report() {
    return Memory.offices[this.missionData.office].powerbanks.find(p => p.id === this.missionData.powerBank);
  }

  run(
    creeps: ResolvedCreeps<PowerBankMission>,
    missions: ResolvedMissions<PowerBankMission>,
    data: PowerBankMissionData
  ) {
    const { haulers } = creeps;

    if (!this.report() && !haulers.length) {
      this.status = MissionStatus.DONE;
    }

    const powerBankPos = unpackPos(data.powerBankPos);
    const powerBankRuin = Game.rooms[powerBankPos.roomName]
      ? powerBankPos.lookFor(LOOK_RUINS).find(s => s.structure.structureType === STRUCTURE_POWER_BANK)
      : undefined;
    const terminal = roomPlans(data.office)?.headquarters?.terminal.structure;

    for (const hauler of haulers) {
      runStates(
        {
          [States.WITHDRAW]: (mission, creep) => {
            if (
              creep.store.getUsedCapacity(RESOURCE_POWER) ||
              (Game.rooms[powerBankPos.roomName] &&
                !powerBankRuin &&
                !Game.rooms[powerBankPos.roomName].find(FIND_DROPPED_RESOURCES, { filter: RESOURCE_POWER }).length)
            ) {
              return States.DEPOSIT;
            }
            if (powerBankRuin) {
              moveTo(creep, powerBankRuin);
              creep.withdraw(powerBankRuin, RESOURCE_POWER);
            } else {
              moveTo(creep, { pos: powerBankPos, range: 3 });
            }
            Game.map.visual.line(creep.pos, powerBankPos);
            return States.WITHDRAW;
          },
          [States.DEPOSIT]: (mission, creep) => {
            if (!creep.store.getUsedCapacity(RESOURCE_POWER) || !terminal) return States.RECYCLE;
            moveTo(creep, terminal);
            creep.transfer(terminal, RESOURCE_POWER);
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
