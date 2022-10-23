import { SpawnOrder } from 'Minions/spawnQueues';
import { MissionStatus } from 'Missions/Mission';
import { createPowerbankHaulerOrder } from 'Missions/OldImplementations/PowerBank/createPowerbankHaulerOrder';
import { squadMissionById } from 'Missions/Selectors';
import { isCreep } from 'Selectors/typeguards';
import { unpackPos } from 'utils/packrat';
import { createSquadMission, SquadMission, SquadMissionType } from '..';
import { SquadMissionImplementation } from '../SquadMissionImplementation';
import { createPowerBankDuoMission, PowerBankDuo, PowerBankDuoMission } from './PowerBankDuo';

export interface PowerBankData {
  powerbank: Id<StructurePowerBank>;
  powerBankPos: string;
  duos: string[];
  haulers: string[];
}
export type PowerBankMission = SquadMission<SquadMissionType.POWER_BANK, PowerBankData>;

export const createPowerBankMission = (office: string, report: { id: Id<StructurePowerBank>; pos: string }) =>
  createSquadMission(office, SquadMissionType.POWER_BANK, 6, {
    powerbank: report.id,
    powerBankPos: report.pos,
    duos: [],
    haulers: []
  });

export class PowerBank implements SquadMissionImplementation {
  constructor(public mission: PowerBankMission) {
    mission.data.duos ??= [];
    mission.data.haulers ??= [];
  }

  get duos() {
    const list = this.mission.data.duos
      .map(d => {
        const mission = squadMissionById(this.mission.office, d) as PowerBankDuoMission;
        if (mission) return new PowerBankDuo(mission);
        return undefined;
      })
      .filter((m): m is PowerBankDuo => !!m);
    this.mission.data.duos = list.map(m => m.mission.id);
    return list;
  }

  get haulers(): Creep[] {
    return this.mission.data.haulers.map(n => Game.creeps[n]).filter(isCreep);
  }

  get report() {
    return Memory.offices[this.mission.office].powerbanks.find(r => r.id === this.mission.data.powerbank);
  }

  register(creep: Creep) {
    if (!this.mission.data.haulers.includes(creep.name)) this.mission.data.haulers.push(creep.name);
  }

  spawn() {
    const orders: SpawnOrder[] = [];
    if (!this.report?.distance) return orders;
    const totalDamage = this.duos.reduce((sum, d) => sum + (d?.damageRemaining() ?? 0), 0);
    const perTickDamage = this.duos.reduce((sum, d) => sum + (d?.damagePerTick() ?? 0), 0);
    if (
      this.duos.length < this.report.adjacentSquares &&
      this.duos.every(d => d.assembled()) &&
      totalDamage < this.report.hits
    ) {
      const mission = createPowerBankDuoMission(
        this.mission.office,
        this.mission.priority,
        this.mission.data.powerbank,
        this.mission.data.powerBankPos
      );
      this.mission.data.duos.push(mission.id);
    }
    if (totalDamage > this.report.hits && perTickDamage * (this.report.distance + 450) > this.report.hits) {
      // power bank will break within the next `distance + 450` ticks
      const targetHaulers = Math.ceil(this.report.amount / (CARRY_CAPACITY * 25));
      const actualHaulers = this.haulers.length;
      if (targetHaulers - actualHaulers > 0) {
        orders.push(
          ...new Array(targetHaulers - actualHaulers)
            .fill(0)
            .map(() =>
              createPowerbankHaulerOrder(
                this.mission.office,
                this.mission.id,
                this.mission.data.powerbank,
                this.mission.data.powerBankPos,
                this.mission.priority
              )
            )
        );
      }
    }
    return orders;
  }

  run() {
    if (!this.report && !this.haulers.length) {
      this.mission.status = MissionStatus.DONE;
      return;
    }
  }

  status() {
    return `[PowerBank ${this.report?.pos ? unpackPos(this.report?.pos) : '<unknown>'} duos:${this.duos.length}/${
      this.mission.data.duos
    } haulers:${this.haulers.length}/${this.mission.data.haulers.length}]`;
  }
}
