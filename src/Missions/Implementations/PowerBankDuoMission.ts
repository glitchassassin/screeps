import { recycle } from 'Behaviors/recycle';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { follow, isExit, moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { minionCost } from 'Selectors/minionCostPerTick';
// import { logCpu, logCpuStart } from 'utils/logCPU';
import { unpackPos } from 'utils/packrat';
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
  budget = Budget.ESSENTIAL;
  public creeps = {
    attacker: new CreepSpawner(
      'a',
      this.missionData.office,
      {
        role: MinionTypes.POWER_BANK_ATTACKER,
        budget: Budget.ESSENTIAL,
        body: energy => MinionBuilders[MinionTypes.POWER_BANK_ATTACKER](energy, this.report()?.duoSpeed ?? 1)
      },
      creep => this.recordCreepEnergy(creep)
    ),
    healer: new CreepSpawner(
      'b',
      this.missionData.office,
      {
        role: MinionTypes.POWER_BANK_HEALER,
        budget: Budget.ESSENTIAL,
        body: energy => MinionBuilders[MinionTypes.POWER_BANK_HEALER](energy, this.report()?.duoSpeed ?? 1)
      },
      creep => this.recordCreepEnergy(creep)
    )
  };

  priority = 8;

  constructor(public missionData: PowerBankDuoMissionData, id?: string) {
    super(missionData, id);

    const energy = Game.rooms[missionData.office].energyCapacityAvailable;
    this.estimatedEnergyRemaining ??=
      minionCost(MinionBuilders[MinionTypes.POWER_BANK_ATTACKER](energy, this.report()?.duoSpeed ?? 1)) +
      minionCost(MinionBuilders[MinionTypes.POWER_BANK_HEALER](energy, this.report()?.duoSpeed ?? 1));
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

  arrived() {
    const report = this.report();
    const attacker = this.creeps.attacker.resolved;
    if (!attacker || !report) return false;
    return getRangeTo(attacker.pos, unpackPos(report.pos)) === 1;
  }

  actualDamageRemaining(ticks: number = CREEP_LIFE_TIME) {
    if (!this.arrived()) return 0;
    return this.damageRemaining(ticks);
  }

  damageRemaining(ticks: number = CREEP_LIFE_TIME) {
    return this.damagePerTick() * Math.min(Math.max(0, ticks), this.creeps.attacker.resolved?.ticksToLive ?? 0);
  }

  damagePerTick() {
    // only count damage when at power bank
    return (this.creeps.attacker.resolved?.getActiveBodyparts(ATTACK) ?? 0) * ATTACK_POWER;
  }

  onStart() {
    super.onStart();
    console.log('[PowerBankDuoMission] started targeting', unpackPos(this.missionData.powerBankPos));
  }

  onParentEnd() {
    super.onParentEnd();
    this.status = MissionStatus.DONE;
  }

  run(
    creeps: ResolvedCreeps<PowerBankDuoMission>,
    missions: ResolvedMissions<PowerBankDuoMission>,
    data: PowerBankDuoMissionData
  ) {
    // logCpuStart();
    const { attacker, healer } = creeps;
    const { powerBank: powerBankId } = data;

    if (this.creeps.attacker.died && this.creeps.healer.died) {
      this.status = MissionStatus.DONE;
      return;
    } else if (this.creeps.attacker.died || this.creeps.healer.died) {
      attacker?.say('broken');
      healer?.say('broken');
      // duo has been broken
      attacker && recycle(this.missionData, attacker);
      healer && recycle(this.missionData, healer);
      return;
    }
    if (!attacker || !healer) return; // wait for both creeps
    // logCpu('setup');

    const powerBank = byId(powerBankId);
    const powerBankPos = unpackPos(this.missionData.powerBankPos);

    const healTarget = healer.hits < healer.hitsMax ? healer : attacker;
    // logCpu('data');

    // movement
    if (getRangeTo(attacker.pos, healer.pos) !== 1) {
      if (!isExit(attacker.pos)) {
        // come together
        moveTo(healer, attacker);
      } else {
        moveTo(attacker, powerBankPos);
        moveTo(healer, attacker);
      }
      // logCpu('moving together');
    } else {
      // duo is assembled
      if (this.report()) {
        attacker.say('Power!');
        // attacker movement
        moveTo(attacker, { pos: powerBankPos, range: 1 });
        // healer movement
        follow(healer, attacker);
      } else {
        attacker.say('Recycling');
        recycle(this.missionData, attacker);
        recycle(this.missionData, healer);
      }
      // logCpu('moving');

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
      // logCpu('attacking');
    }
  }
}
