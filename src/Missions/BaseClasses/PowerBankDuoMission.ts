import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from './CreepSpawner/CreepSpawner';
import { MultiCreepSpawner } from './CreepSpawner/MultiCreepSpawner';
import { BaseMissionData, MissionImplementation, ResolvedCreeps, ResolvedMissions } from './MissionImplementation';

export interface PowerBankDuoMissionData extends BaseMissionData {
  powerBank: Id<StructurePowerBank>;
  powerBankPos: string;
}

export class PowerBankDuoMission extends MissionImplementation {
  public creeps = {
    attacker: new CreepSpawner('a', this.missionData.office, {
      role: MinionTypes.GUARD,
      body: energy => MinionBuilders[MinionTypes.GUARD](energy, false)
    }),
    healer: new CreepSpawner('b', this.missionData.office, {
      role: MinionTypes.MEDIC,
      body: energy => MinionBuilders[MinionTypes.MEDIC](energy)
    }),
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      body: energy => MinionBuilders[MinionTypes.ACCOUNTANT](energy, 25, false, false),
      count: () => Math.ceil((this.report()?.amount ?? 0) / (25 * CARRY_CAPACITY))
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
    const { attacker, healer, haulers } = creeps;
    const { powerBank } = data;
  }
}
