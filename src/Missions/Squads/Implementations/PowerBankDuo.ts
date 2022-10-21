import { MinionTypes } from 'Minions/minionTypes';
import { createPowerBankDuoOrder } from 'Missions/Implementations/PowerBank/createPowerbankDuoOrder';
import { MissionStatus } from 'Missions/Mission';
import { follow, isExit, moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { isAttacker, isHealer } from 'Selectors/Combat/combatStats';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { powerBankReport } from 'Strategy/ResourceAnalysis/Selectors';
import { unpackPos } from 'utils/packrat';
import { createSquadMission, SquadMission, SquadMissionType } from '..';
import { SquadMissionImplementation } from '../SquadMissionImplementation';

export interface PowerBankDuoData {
  attacker?: string;
  healer?: string;
  powerbank: Id<StructurePowerBank>;
  powerBankPos: string;
  room?: string;
}
export type PowerBankDuoMission = SquadMission<SquadMissionType.POWER_BANK_DUO, PowerBankDuoData>;

export const createPowerBankDuoMission = (
  office: string,
  priority: number,
  powerbank: Id<StructurePowerBank>,
  powerBankPos: string
) => createSquadMission(office, SquadMissionType.POWER_BANK_DUO, priority, { powerbank, powerBankPos });

export class PowerBankDuo implements SquadMissionImplementation {
  constructor(public mission: PowerBankDuoMission) {}

  get attacker(): Creep | undefined {
    return Game.creeps[this.mission.data.attacker ?? ''];
  }

  get healer(): Creep | undefined {
    return Game.creeps[this.mission.data.healer ?? ''];
  }

  /**
   * Creeps are in formation
   */
  assembled() {
    return this.healer && this.attacker?.pos.isNearTo(this.healer);
  }
  /**
   * One or both of the creeps is dead - fall back to solo behavior
   */
  broken() {
    return (this.mission.data.healer && !this.healer) || (this.mission.data.attacker && !this.attacker);
  }

  register(creep: Creep) {
    if (isAttacker(creep)) {
      this.mission.data.attacker = creep.name;
    } else if (isHealer(creep)) {
      this.mission.data.healer = creep.name;
    }
  }

  spawn() {
    const orders = [];
    const powerbank = powerBankReport(this.mission.office, this.mission.data.powerbank);
    if (!powerbank?.duoSpeed) return [];
    if (!this.attacker)
      orders.push(
        createPowerBankDuoOrder(
          this.mission.office,
          MinionTypes.POWER_BANK_ATTACKER,
          powerbank.duoSpeed,
          this.mission.id,
          this.mission.priority
        )
      );
    if (!this.healer)
      orders.push(
        createPowerBankDuoOrder(
          this.mission.office,
          MinionTypes.POWER_BANK_HEALER,
          powerbank.duoSpeed,
          this.mission.id,
          this.mission.priority
        )
      );
    return orders;
  }

  damageRemaining() {
    return this.damagePerTick() * (this.attacker?.ticksToLive ?? 0);
  }

  damagePerTick() {
    // only count damage when at power bank
    return (this.attacker?.getActiveBodyparts(ATTACK) ?? 0) * ATTACK_POWER;
  }

  run() {
    if (this.broken()) {
      this.mission.status = MissionStatus.DONE;
      return;
    }
    if (!this.attacker || !this.healer) return; // wait for both creeps

    const report = powerBankReport(this.mission.office, this.mission.data.powerbank);
    const powerBank = byId(report?.id);
    const powerBankPos = unpackPos(this.mission.data.powerBankPos);

    const healTargets = [this.attacker, this.healer];
    const healTarget = healTargets.find(c => c && c.hits < c.hitsMax && this.healer?.pos.inRangeTo(c, 3));

    Game.map.visual.line(this.attacker.pos, powerBankPos, { color: '#00ff00' });

    // movement
    if (!this.assembled()) {
      if (!isExit(this.attacker.pos)) {
        if (this.attacker && this.healer) {
          // come together
          // moveTo(this.attacker, this.healer);
          moveTo(this.healer, this.attacker);
        } else if (this.mission.data.attacker && this.mission.data.healer) {
          // duo has been broken
          this.attacker?.say('MEDIC!', true);
          this.healer?.say('HELP!', true);
        }
      } else {
        moveTo(this.attacker, powerBankPos);
        moveTo(this.healer, this.attacker);
      }
    } else {
      // duo is assembled, or has been broken
      // attacker movement
      moveTo(this.attacker, powerBankPos);
      // healer movement

      follow(this.healer, this.attacker);

      // creep actions
      if (this.healer && healTarget) {
        if (getRangeTo(this.healer.pos, healTarget.pos) > 1) {
          this.healer.rangedHeal(healTarget);
        } else {
          this.healer.heal(healTarget);
        }
      }

      if (this.attacker) {
        // attack target
        if (powerBank) this.attacker.attack(powerBank);
      }
    }
  }

  status() {
    return `[PowerBankDuo A:${this.attacker?.name ?? '__'} H:${this.healer?.name ?? '__'}]`;
  }
}
