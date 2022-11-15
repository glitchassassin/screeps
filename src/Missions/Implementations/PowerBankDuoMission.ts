import { getBoosted } from 'Behaviors/getBoosted';
import { recycle } from 'Behaviors/recycle';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { follow, isExit, moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { combatPower } from 'Selectors/Combat/combatStats';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { maxBuildCost } from 'Selectors/minionCostPerTick';
import { boostsAvailable } from 'Selectors/shouldHandleBoosts';
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
        builds: energy => MinionBuilders[MinionTypes.POWER_BANK_ATTACKER](energy, this.maxTier)
      },
      creep => this.recordCreepEnergy(creep)
    ),
    healer: new CreepSpawner(
      'b',
      this.missionData.office,
      {
        role: MinionTypes.POWER_BANK_HEALER,
        builds: energy => MinionBuilders[MinionTypes.POWER_BANK_HEALER](energy, this.maxTier)
      },
      creep => this.recordCreepEnergy(creep)
    )
  };

  priority = 8;
  maxTier: 0 | 1 | 2 | 3 = 3;

  constructor(public missionData: PowerBankDuoMissionData, id?: string) {
    super(missionData, id);

    const energy = Game.rooms[missionData.office].energyCapacityAvailable;
    this.estimatedEnergyRemaining ??=
      maxBuildCost(MinionBuilders[MinionTypes.POWER_BANK_ATTACKER](energy)) +
      maxBuildCost(MinionBuilders[MinionTypes.POWER_BANK_HEALER](energy));

    this.maxTier = PowerBankDuoMission.boostsAvailable(missionData.office);
  }
  static fromId(id: PowerBankDuoMission['id']) {
    return super.fromId(id) as PowerBankDuoMission;
  }

  static boostsAvailable(office: string): 0 | 1 | 2 | 3 {
    const energy = Game.rooms[office].energyCapacityAvailable;
    const attacker = MinionBuilders[MinionTypes.POWER_BANK_ATTACKER](energy);
    const healer = MinionBuilders[MinionTypes.POWER_BANK_HEALER](energy);
    for (let i = 0; i < 3; i++) {
      const boosts = attacker[i].boosts.concat(healer[i].boosts).reduce((sum, boost) => {
        sum[boost.type] = boost.count * LAB_BOOST_MINERAL;
        return sum;
      }, {} as Record<string, number>);
      if (Object.keys(boosts).every(boost => boostsAvailable(office, boost as MineralBoostConstant) >= boosts[boost])) {
        return (3 - i) as 1 | 2 | 3; // boost tier
      }
    }
    return 0; // no boosts available
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
    if (!this.creeps.attacker.resolved) return 0;
    return combatPower(this.creeps.attacker.resolved).attack;
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
    } else if (attacker?.memory.runState === States.GET_BOOSTED || healer?.memory.runState === States.GET_BOOSTED) {
      if (attacker?.memory.runState === States.GET_BOOSTED) {
        attacker.memory.runState = getBoosted(States.WORKING)(data, attacker);
      }
      if (healer?.memory.runState === States.GET_BOOSTED) {
        healer.memory.runState = getBoosted(States.WORKING)(data, healer);
      }
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
