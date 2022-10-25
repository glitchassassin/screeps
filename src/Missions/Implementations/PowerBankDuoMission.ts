import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { follow, isExit, moveTo } from 'screeps-cartographer';
import { unpackPos } from 'screeps-cartographer/dist/utils/packrat';
import { byId } from 'Selectors/byId';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { powerBankReport } from 'Strategy/ResourceAnalysis/Selectors';
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
    return super.fromId(id) as PowerBankDuoMission;
  }

  report() {
    return Memory.offices[this.missionData.office].powerbanks.find(p => p.id === this.missionData.powerBank);
  }

  assembled() {
    const attacker = this.creeps.attacker.resolved;
    const healer = this.creeps.healer.resolved;
    if (!attacker || !healer) return false;
    return getRangeTo(attacker.pos, healer.pos) === 1;
  }

  damageRemaining() {
    return this.damagePerTick() * (this.creeps.attacker.resolved?.ticksToLive ?? 0);
  }

  damagePerTick() {
    // only count damage when at power bank
    return (this.creeps.attacker.resolved?.getActiveBodyparts(ATTACK) ?? 0) * ATTACK_POWER;
  }

  run(
    creeps: ResolvedCreeps<PowerBankDuoMission>,
    missions: ResolvedMissions<PowerBankDuoMission>,
    data: PowerBankDuoMissionData
  ) {
    const { attacker, healer } = creeps;
    const { powerBank: powerBankId } = data;

    if (this.creeps.attacker.died || this.creeps.healer.died) {
      // duo has been broken
      attacker?.say('MEDIC!', true);
      healer?.say('HELP!', true);
      this.status = MissionStatus.DONE;
      return;
    }
    if (!attacker || !healer) return; // wait for both creeps

    const report = powerBankReport(this.missionData.office, powerBankId);
    const powerBank = byId(powerBankId);
    const powerBankPos = unpackPos(this.missionData.powerBankPos);

    const healTargets = [attacker, healer];
    const healTarget = healTargets.find(c => c && c.hits < c.hitsMax && healer?.pos.inRangeTo(c, 3));

    Game.map.visual.line(attacker.pos, powerBankPos, { color: '#00ff00' });

    // movement
    if (getRangeTo(attacker.pos, healer.pos) !== 1) {
      if (!isExit(attacker.pos)) {
        // come together
        moveTo(healer, attacker);
      } else {
        moveTo(attacker, powerBankPos);
        moveTo(healer, attacker);
      }
    } else {
      // duo is assembled
      // attacker movement
      moveTo(attacker, powerBankPos);
      // healer movement
      follow(healer, attacker);

      // creep actions
      if (healer && healTarget) {
        if (getRangeTo(healer.pos, healTarget.pos) > 1) {
          healer.rangedHeal(healTarget);
        } else {
          healer.heal(healTarget);
        }
      }

      if (attacker) {
        // attack target
        if (powerBank) attacker.attack(powerBank);
      }
    }
  }
}
