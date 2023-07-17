import { getBoosted } from 'Behaviors/getBoosted';
import { recycle } from 'Behaviors/recycle';
import { States } from 'Behaviors/states';
import { bestBuildTier } from 'Minions/bestBuildTier';
import { buildPowerbankAttacker, buildPowerbankHealer } from 'Minions/Builds/powerbank';
import { atLeastTier, isTier } from 'Minions/Builds/utils';
import { MinionTypes } from 'Minions/minionTypes';
import { CreepSpawner } from 'Missions/BaseClasses/CreepSpawner/CreepSpawner';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { and, or } from 'Missions/Selectors';
import { follow, isExit, moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { combatPower } from 'Selectors/Combat/combatStats';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { maxBuildCost } from 'Selectors/minionCostPerTick';
import { PowerBankReport } from 'Strategy/ResourceAnalysis/PowerBank';
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
  boostTier: number;
  leftHome?: number;
}

export class PowerBankDuoMission extends MissionImplementation {
  budget = Budget.ESSENTIAL;
  public creeps = {
    attacker: new CreepSpawner(
      'a',
      this.missionData.office,
      {
        role: MinionTypes.POWER_BANK_ATTACKER,
        builds: energy => buildPowerbankAttacker().filter(isTier(this.missionData.boostTier))
      },
      {
        onSpawn: creep => this.recordCreepEnergy(creep),
        onNoBoosts: () => (this.status = MissionStatus.DONE) // cancel this mission and try a new one
      }
    ),
    healer: new CreepSpawner(
      'b',
      this.missionData.office,
      {
        role: MinionTypes.POWER_BANK_HEALER,
        builds: energy => buildPowerbankHealer().filter(isTier(this.missionData.boostTier))
      },
      {
        onSpawn: creep => this.recordCreepEnergy(creep),
        onNoBoosts: () => (this.status = MissionStatus.DONE) // cancel this mission and try a new one
      }
    )
  };

  priority = 8;

  constructor(public missionData: PowerBankDuoMissionData, id?: string) {
    super(missionData, id);

    this.estimatedEnergyRemaining ??= maxBuildCost(buildPowerbankAttacker()) + maxBuildCost(buildPowerbankHealer());
  }
  static fromId(id: PowerBankDuoMission['id']) {
    return super.fromId(id) as PowerBankDuoMission;
  }

  static costAnalysis(office: string, report: PowerBankReport) {
    if (!report.distance) return {};
    // Do we have time to crack with multiple unboosted duos?
    const timeRemaining = report.expires - Game.time;
    const unboostedTimeToCrack = CREEP_LIFE_TIME - report.distance;
    const timeToSpawn = 100 * CREEP_SPAWN_TIME;

    const unboostedAttackerBuild = buildPowerbankAttacker().filter(isTier(0));
    const unboostedAttackerDamagePerTick = unboostedAttackerBuild[0].body.reduce(
      (sum, p) => sum + (p === ATTACK ? ATTACK_POWER : 0),
      0
    );

    // underestimates, because spawn time assumes a single spawn instead of three at RCL8
    const maxUnboostedDuos = (timeRemaining - unboostedTimeToCrack) / timeToSpawn;
    const maxDamage = maxUnboostedDuos * unboostedAttackerDamagePerTick * unboostedTimeToCrack;

    const canUseUnboostedDuos = maxDamage >= report.hits;

    // collect viable builds

    const timeToBoost = 200;
    const timeToCrack = CREEP_LIFE_TIME - timeToBoost - report.distance;
    const minTier = [3031, 1112, 654, 439].findIndex(t => t < timeToCrack);
    if (minTier === -1) return {}; // if a boosted duo can't crack it, don't bother

    const attackerBuilds = buildPowerbankAttacker().filter(
      or(
        atLeastTier(minTier),
        and(() => canUseUnboostedDuos, isTier(0))
      )
    );
    const healerBuilds = buildPowerbankHealer().filter(
      or(
        atLeastTier(minTier),
        and(() => canUseUnboostedDuos, isTier(0))
      )
    );

    // update cost to reflect multiple tier-0 duos
    const duoCountRemaining = Math.ceil((report.duoCount ?? 1) * (report.hits / POWER_BANK_HITS));
    [...attackerBuilds, ...healerBuilds].forEach(b => {
      if (b.tier === 0) b.cost *= duoCountRemaining;
    });

    // get best tier
    const bestTier = bestBuildTier(office, [attackerBuilds, healerBuilds]);

    if (bestTier === undefined) return {};

    // get cost to crack
    const costToCrack =
      maxBuildCost(attackerBuilds.filter(isTier(bestTier))) + maxBuildCost(healerBuilds.filter(atLeastTier(bestTier)));

    return { attackerBuilds, healerBuilds, bestTier, costToCrack };
  }

  report() {
    return Memory.offices[this.missionData.office].powerbanks.find(p => p.id === this.missionData.powerBank);
  }

  assembled() {
    return this.missionData.leftHome !== undefined;
  }

  arrived() {
    const report = this.report();
    const attacker = this.creeps.attacker.resolved;
    if (!attacker || !report) return false;
    return getRangeTo(attacker.pos, unpackPos(report.pos)) === 1;
  }

  actualDamageRemaining(ticks: number = CREEP_LIFE_TIME) {
    if (this.arrived()) return this.damageRemaining(ticks);
    // predict damage remaining based on distance
    const report = this.report();
    if (!this.missionData.leftHome || !report?.distance) return 0;
    const ticksUntilArrival = report.distance - this.missionData.leftHome;
    return this.damageRemaining(ticks - ticksUntilArrival);
  }

  damageRemaining(ticks: number = CREEP_LIFE_TIME) {
    return this.damagePerTick() * Math.min(Math.max(0, ticks), this.creeps.attacker.resolved?.ticksToLive ?? 0);
  }

  damagePerTick() {
    if (!this.creeps.attacker.resolved) return 0;
    return combatPower(this.creeps.attacker.resolved).attack;
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
    // attacker and healer are both alive and boosted now
    data.leftHome ??= Game.time;
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
        if (powerBank) {
          // if no haulers are present, wait for them before cracking the bank
          if (
            powerBank.hits > this.damagePerTick() * 25 ||
            attacker.room.find(FIND_MY_CREEPS).some(c => c.name.startsWith('PBM'))
          ) {
            attacker.attack(powerBank);
          } else {
            attacker.say("Waiting")
          }
        }
      }
      // logCpu('attacking');
    }

    this.logCpu("creeps");
  }
}
