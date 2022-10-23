import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { Budget } from 'Missions/Budgets';
import { MultiCreepSpawner } from './CreepSpawner/MultiCreepSpawner';
import { BaseMissionData, MissionImplementation, ResolvedCreeps, ResolvedMissions } from './MissionImplementation';
import { MultiMissionSpawner } from './MissionSpawner/MultiMissionSpawner';
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
      count: () => Math.ceil((this.report()?.amount ?? 0) / (25 * CARRY_CAPACITY))
    })
  };

  public missions = {
    duos: new MultiMissionSpawner(
      PowerBankDuoMission,
      () => this.missionData,
      () => 1
    )
  };

  priority = 8;

  constructor(public missionData: PowerBankMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: PowerBankMission['id']) {
    return new this(Memory.missions[id].data, id);
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
    const { powerBank } = data;
    const { duos } = missions;
  }
}
