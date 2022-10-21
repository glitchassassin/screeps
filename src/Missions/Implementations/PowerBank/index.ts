import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionTypes } from 'Minions/minionTypes';
import { Mission, MissionType } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { roomPlans } from 'Selectors/roomPlans';
import { unpackPos } from 'utils/packrat';
import { MissionImplementation } from '../MissionImplementation';

export type PowerBankDuoRoles = MinionTypes.POWER_BANK_ATTACKER | MinionTypes.POWER_BANK_HEALER;
export type PowerBankRoles = PowerBankDuoRoles | MinionTypes.ACCOUNTANT;

export interface PowerBankMission extends Mission<MissionType.POWER_BANK> {
  data: {
    role: PowerBankRoles;
    powerbank: Id<StructurePowerBank>;
    powerBankPos: string;
  };
}

export class PowerBank extends MissionImplementation {
  static minionLogic(mission: PowerBankMission, creep: Creep): void {
    if (mission.data.role !== MinionTypes.ACCOUNTANT) return;
    if (!mission.data.powerBankPos) creep.suicide();

    const powerBankPos = unpackPos(mission.data.powerBankPos);
    const powerBankRuin = powerBankPos
      .lookFor(LOOK_RUINS)
      .find(s => s.structure.structureType === STRUCTURE_POWER_BANK);
    const terminal = roomPlans(mission.office)?.headquarters?.terminal.structure;

    runStates(
      {
        [States.WITHDRAW]: (mission, creep) => {
          if (creep.store.getUsedCapacity(RESOURCE_POWER)) return States.DEPOSIT;
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
      mission,
      creep
    );
  }
}
