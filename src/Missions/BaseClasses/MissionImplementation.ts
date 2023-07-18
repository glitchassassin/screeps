import { Budget, getBudgetAdjustment } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { MissionEnergyAvailable } from 'Selectors/Missions/missionEnergyAvailable';
import { minionCost } from 'Selectors/minionCostPerTick';
import { sum } from 'Selectors/reducers';
import { CPU_ESTIMATE_PERIOD } from 'config';
import { memoizeOncePerTick } from 'utils/memoizeFunction';
import { BaseCreepSpawner } from './CreepSpawner/BaseCreepSpawner';
import { MultiCreepSpawner } from './CreepSpawner/MultiCreepSpawner';
import { BaseMissionSpawner } from './MissionSpawner/BaseMissionSpawner';

declare global {
  interface CreepMemory {
    missionId: `${MissionImplementation['id']}|${BaseCreepSpawner['id']}`;
  }
  interface Memory {
    missions: Record<
      MissionImplementation['id'],
      {
        data: any;
        started: number;
        status: MissionStatus;
        cpuUsed: number;
        cpuOverhead?: number;
        cpuPerCreep?: number;
        energyUsed: number;
        energyRemaining: number;
        missions: Record<string, string[]>;
        creeps: Record<string, any>;
      }
    >;
    missionReports: {
      type: string;
      duration: number;
      cpuUsed: number;
      energyUsed: number;
      finished: number;
      office: string;
    }[];
  }
}

export interface BaseMissionData {
  office: string;
}

const singletons = new Map<MissionImplementation['id'], MissionImplementation>();

export function allMissions() {
  return singletons.values();
}

export function missionById(id: MissionImplementation['id']) {
  return singletons.get(id);
}

export function cleanMissions() {
  for (const missionId in Memory.missions) {
    if (Memory.missions[missionId].status === MissionStatus.CLEANUP) {
      endAndReportMission(missionId);
    }
  }
}

export function purgeOrphanedMissions() {
  if (Game.time % 100 === 0) {
    // Clean up unparented missions
    for (const missionId in Memory.missions) {
      if (singletons.has(missionId)) continue;
      endAndReportMission(missionId);
    }
    // purge lingering singletons
    for (const id of singletons.keys()) {
      if (!Memory.missions[id]) {
        console.log("Lingering singleton detected")
        singletons.delete(id);
      }
    }
  }
}

function endAndReportMission(missionId: MissionImplementation['id']) {
  const mission = singletons.get(missionId);
  if (mission) {
    // file mission report
    Memory.missionReports.push(mission.missionReport());
    singletons.delete(missionId);
  }
  delete Memory.missions[missionId];
}

export class MissionImplementation {
  public creeps: Record<string, BaseCreepSpawner> = {};
  public missions: Record<string, BaseMissionSpawner<typeof MissionImplementation>> = {};
  public id: string;
  public priority = 5;
  public budget = Budget.ESSENTIAL;
  constructor(public missionData: { office: string }, id?: string) {
    const prefix = this.constructor.name
      .split('')
      .filter(c => c === c.toUpperCase())
      .join(''); // Takes uppercase letters as prefix
    const randomString = Number(Math.floor(Math.random() * 0xffff))
      .toString(16)
      .padStart(4, '0');
    this.id = id ?? `${prefix}_${randomString}`;

    const cached = singletons.get(this.id);
    if (cached && Memory.missions[this.id]) return cached;
    singletons.set(this.id, this);

    Memory.missions[this.id] ??= {
      data: missionData,
      started: Game.time,
      status: MissionStatus.PENDING,
      cpuUsed: 0,
      energyUsed: 0,
      energyRemaining: 0,
      missions: {},
      creeps: {}
    };
  }

  missionReport() {
    return {
      type: this.constructor.name,
      duration: Game.time - Memory.missions[this.id].started,
      cpuUsed: Memory.missions[this.id].cpuUsed,
      energyUsed: Memory.missions[this.id].energyUsed,
      finished: Game.time,
      office: this.missionData.office
    }
  }

  get status() {
    return Memory.missions[this.id]?.status;
  }
  set status(value: MissionStatus) {
    Memory.missions[this.id].status = value;
  }
  get estimatedEnergyRemaining() {
    return Memory.missions[this.id]?.energyRemaining ?? 0;
  }
  set estimatedEnergyRemaining(value: number) {
    Memory.missions[this.id].energyRemaining = value;
  }

  initialized = false;
  init() {
    if (this.initialized) return;
    // Initialize missions with memory space
    for (const mission in this.missions) {
      const spawner = this.missions[mission];
      Memory.missions[this.id].missions[mission] ??= [];
      spawner.register(Memory.missions[this.id].missions[mission]);
    }

    // initialize CPU log
    const spawners = Object.keys(this.creeps)
    const perCreep = spawners.length ? spawners.reduce((sum, spawner) => this.creeps[spawner].cpuPerTick + sum, 0) / spawners.length : 0;
    this._cpuLog = Array(this._cpuLogCount)
      .fill(0)
      .map(() => ({
        perCreep: Memory.missions[this.id].cpuPerCreep ?? perCreep,
        overhead: Memory.missions[this.id].cpuOverhead ?? this.initialEstimatedCpuOverhead
      }));
    this.initialized = true;
  }

  static fromId(id: MissionImplementation['id']) {
    if (singletons.has(id)) return singletons.get(id);
    if (Memory.missions[id]) return new this(Memory.missions[id].data, id);
    return undefined;
  }

  spawn() {
    if (this.status !== MissionStatus.RUNNING) return [];
    const orders = [];
    for (let key in this.creeps) {
      const prop = this.creeps[key];
      orders.push(...prop.spawn(`${this.id}|${prop.id}`, this.priority));
    }
    return orders;
  }

  execute() {
    // Mission Energy Budgeting
    // By default, missions have an ESSENTIAL budget and ignore
    // budget constraints. Giving them another type of budget and
    // setting `estimatedEnergyRemaining` in the constructor will
    // leave the mission as PENDING until there is enough energy
    // in storage.
    if (
      this.status === MissionStatus.PENDING &&
      (MissionEnergyAvailable[this.missionData.office] ?? 0) -
        getBudgetAdjustment(this.missionData.office, this.budget) <
        this.estimatedEnergyRemaining
    ) {
      this.onPending();
      return; // not enough energy to start yet
    }

    this.logCpu('overhead');

    // Register (and generate) sub-missions
    this.init();

    // clean up mission
    if (this.status === MissionStatus.PENDING) {
      this.onStart();
      // Set status to RUNNING
      this.status = MissionStatus.RUNNING;
    }
    if (this.status === MissionStatus.DONE) {
      this.onEnd();
      return;
    }

    // register ids
    for (const mission in this.missions) {
      this.missions[mission].register(Memory.missions[this.id].missions[mission] ?? []);
    }
    // register spawner memory
    for (const spawner in this.creeps) {
      Memory.missions[this.id].creeps[spawner] ??= {};
      this.creeps[spawner].setMemory(Memory.missions[this.id].creeps[spawner]);
    }

    // spawn and resolve missions
    const resolvedMissions: ResolvedMissions<MissionImplementation> = {};
    try {
      for (const k in this.missions) {
        this.missions[k].spawn();
        resolvedMissions[k] = this.missions[k].resolved;
      }

      // cache ids
      for (const mission in resolvedMissions) {
        const resolved = resolvedMissions[mission];
        if (Array.isArray(resolved)) {
          Memory.missions[this.id].missions[mission] = resolved.map(m => m.id);
        } else if (resolved) {
          Memory.missions[this.id].missions[mission] = [resolved.id];
        } else {
          Memory.missions[this.id].missions[mission] = [];
        }
      }
    } catch (e) {
      console.log('Error spawning missions', this.id, e);
    }

    // resolve creeps
    const resolvedCreeps = {} as { [T in keyof this['creeps']]: this['creeps'][T]['resolved'] };

    try {
      Object.keys(this.creeps)
        .map(k => ({ key: k, value: this.creeps[k].resolved }))
        .forEach(({ key, value }) => {
          resolvedCreeps[key as keyof this['creeps']] = value;
        });
    } catch (e) {
      console.log('Error resolving creeps', this.id, e);
    }

    // run logic
    this.run(resolvedCreeps, resolvedMissions, this.missionData);

    // log CPU usage
    this.logCpu('overhead');
    const count = this.creepCount();
    this._cpuLog.push({
      perCreep: count ? this._cpuTickLog.creeps / count : this.cpuStats().perCreep, // track average perCreep even when we have no creeps
      overhead: this._cpuTickLog.overhead
    });
    if (this._cpuLog.length > this._cpuLogCount) {
      this._cpuLog = this._cpuLog.slice(this._cpuLog.length - this._cpuLogCount);
    }
    const { overhead, perCreep } = this.cpuStats();
    Memory.missions[this.id].cpuOverhead = overhead;
    Memory.missions[this.id].cpuPerCreep = perCreep;
  }

  initialEstimatedCpuOverhead = 0.05;

  private _cpuTickLog = {
    creeps: 0,
    overhead: 0
  };
  private _cpuTick = 0;
  private _lastCpu = 0;
  logCpu(category: keyof typeof this._cpuTickLog) {
    if (this._cpuTick !== Game.time) {
      this._cpuTick = Game.time;
      this._lastCpu = Math.max(0, Game.cpu.getUsed());
      this._cpuTickLog = {
        creeps: 0,
        overhead: 0
      };
    }
    const current = Math.max(0, Game.cpu.getUsed());
    this._cpuTickLog[category] += current - this._lastCpu;
    this._lastCpu = current;
  }
  private _cpuLog: { perCreep: number, overhead: number }[] = [];
  private _cpuLogCount = <const>1000;

  cpuStats = memoizeOncePerTick(() => {
    const { perCreep, overhead } = this._cpuLog.reduce(
      (acc, cur) => ({
        perCreep: acc.perCreep + cur.perCreep,
        overhead: acc.overhead + cur.overhead
      }),
      { perCreep: 0, overhead: 0 }
    );
    return {
      perCreep: perCreep / this._cpuLog.length,
      overhead: overhead / this._cpuLog.length
    };
  })

  register(creep: Creep) {
    for (let key in this.creeps) {
      const spawner = this.creeps[key];
      if (creep.memory.missionId === `${this.id}|${spawner.id}`) {
        spawner.register(creep, () => this.recordEnergy(minionCost(creep.body.map(p => p.type))));
      }
    }
  }

  run(
    creeps: ResolvedCreeps<MissionImplementation>,
    missions: ResolvedMissions<MissionImplementation>,
    data: MissionImplementation['missionData']
  ) {
    throw new Error('Not implemented yet');
  }

  onPending() {}

  onStart() {}

  onEnd() {
    for (const mission in this.missions) {
      const resolved = this.missions[mission].resolved;
      if (resolved) {
        if (Array.isArray(resolved)) {
          resolved.forEach(m => m.onParentEnd());
        } else {
          resolved.onParentEnd();
        }
      }
    }
    this.status = MissionStatus.CLEANUP;
  }

  onParentEnd() {
    this.status = MissionStatus.DONE;
  }

  cpuRemaining() {
    if (this.status !== MissionStatus.RUNNING) return 0;
    const { perCreep, overhead } = this.cpuStats();
    return Object.keys(this.creeps).reduce((sum, spawner) => this.creeps[spawner].ttlRemaining() + sum, 0) * perCreep + (overhead * CPU_ESTIMATE_PERIOD);
  }
  cpuUsed() {
    return Memory.missions[this.id].cpuUsed;
  }

  estimatedCpuPerCreep() {
    if (this.status !== MissionStatus.RUNNING) return 0;
    return this.cpuStats().perCreep;
  }
  estimatedCpuOverhead = memoizeOncePerTick(() => {
    return this.cpuStats().overhead;
  })
  energyRemaining() {
    if (this.status !== MissionStatus.RUNNING) return 0;
    return this.estimatedEnergyRemaining;
  }
  energyUsed() {
    return Memory.missions[this.id].energyUsed;
  }
  recordEnergy(energy: number) {
    Memory.missions[this.id].energyUsed += energy;
  }
  recordCreepEnergy(creep: Creep, adjustEstimated = true) {
    const energy = minionCost(creep.body.map(p => p.type));
    if (adjustEstimated) this.estimatedEnergyRemaining = Math.max(0, this.estimatedEnergyRemaining - energy);
  }
  recordMissionEnergy(mission: MissionImplementation) {
    this.estimatedEnergyRemaining = Math.max(0, this.estimatedEnergyRemaining - mission.estimatedEnergyRemaining);
    // doesn't record energy, as this mission isn't actually the one spending it
  }

  creepCount() {
    return Object.keys(this.creeps)
      .map(k => {
        const spawner = this.creeps[k];
        return spawner instanceof MultiCreepSpawner ? spawner.resolved.length : spawner.resolved ? 1 : 0;
      })
      .reduce(sum, 0);
  }

  toString() {
    return `[${this.constructor.name}:${this.id}]`;
  }
}

export type ResolvedCreeps<Mission extends MissionImplementation> = {
  [T in keyof Mission['creeps']]: Mission['creeps'][T]['resolved'];
};
export type ResolvedMissions<Mission extends MissionImplementation> = {
  [T in keyof Mission['missions']]: Mission['missions'][T]['resolved'];
};
