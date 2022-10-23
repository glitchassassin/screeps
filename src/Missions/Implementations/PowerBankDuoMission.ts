import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import { Budget } from 'Missions/Budgets';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from '../BaseClasses/MissionImplementation';

export interface PowerBankDuoMissionData extends BaseMissionData {
  powerBank: Id<StructurePowerBank>;
  powerBankPos: string;
}

export class PowerBankDuoMission extends MissionImplementation {
  public creeps = {
    attacker: new CreepSpawner('a', this.missionData.office, {
      role: MinionTypes.GUARD,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.GUARD](energy, false)
    }),
    healer: new CreepSpawner('b', this.missionData.office, {
      role: MinionTypes.MEDIC,
      budget: Budget.SURPLUS,
      body: energy => MinionBuilders[MinionTypes.MEDIC](energy)
    })
  };

  priority = 8;

  constructor(public missionData: PowerBankDuoMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: PowerBankDuoMission['id']) {
    return new this(Memory.missions[id].data, id);
  }

  report() {
    return Memory.offices[this.missionData.office].powerbanks.find(p => p.id === this.missionData.powerBank);
  }

  run(
    creeps: ResolvedCreeps<PowerBankDuoMission>,
    missions: ResolvedMissions<PowerBankDuoMission>,
    data: PowerBankDuoMissionData
  ) {
    const { attacker, healer } = creeps;
    const { powerBank } = data;
  }
}
