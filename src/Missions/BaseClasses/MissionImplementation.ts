import { MissionStatus } from 'Missions/Mission';
import { BaseCreepSpawner } from './CreepSpawner/BaseCreepSpawner';
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
        cpuUsed: number;
        energyUsed: number;
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

export class MissionImplementation {
  public creeps: Record<string, BaseCreepSpawner> = {};
  public missions: Record<string, BaseMissionSpawner<typeof MissionImplementation>> = {};
  public status = MissionStatus.PENDING;
  public id: string;
  public priority = 5;
  public estimatedEnergyRemaining = 0;
  constructor(public missionData: { office: string }, id?: string) {
    this.id =
      id ??
      Number(Math.floor(Math.random() * 0xffffffff))
        .toString(16)
        .padStart(8, '0');

    const cached = singletons.get(this.id);
    if (cached && Memory.missions[this.id]) return cached;
    singletons.set(this.id, this);

    Memory.missions[this.id] ??= {
      data: missionData,
      started: Game.time,
      cpuUsed: 0,
      energyUsed: 0,
      missions: {},
      creeps: {}
    };
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
    this.initialized = true;
  }

  static fromId(id: MissionImplementation['id']) {
    return new this(Memory.missions[id].data, id);
  }

  spawn() {
    const orders = [];
    for (let key in this.creeps) {
      const prop = this.creeps[key];
      orders.push(...prop.spawn(`${this.id}|${prop.id}`, this.priority));
    }
    return orders;
  }

  execute() {
    this.init();
    const start = Game.cpu.getUsed();

    // clean up mission
    if (this.status === MissionStatus.PENDING) {
      this.onStart();
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

    // resolve missions
    const resolvedMissions: ResolvedMissions<MissionImplementation> = Object.keys(this.missions)
      .map(k => ({ key: k, value: this.missions[k].resolved }))
      .reduce((sum, { key, value }) => {
        sum[key as keyof this['missions']] = value;
        return sum;
      }, {} as { [T in keyof this['missions']]: this['missions'][T]['resolved'] });

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

    // resolve creeps
    const resolvedCreeps = Object.keys(this.creeps)
      .map(k => ({ key: k, value: this.creeps[k].resolved }))
      .reduce((sum, { key, value }) => {
        sum[key as keyof this['creeps']] = value;
        return sum;
      }, {} as { [T in keyof this['creeps']]: this['creeps'][T]['resolved'] });

    // run logic
    this.run(resolvedCreeps, resolvedMissions, this.missionData);

    // log CPU usage
    Memory.missions[this.id].cpuUsed += Math.max(0, Game.cpu.getUsed() - start);
  }

  register(creep: Creep) {
    for (let key in this.creeps) {
      const spawner = this.creeps[key];
      if (creep.memory.missionId === `${this.id}|${spawner.id}`) {
        spawner.register(creep);
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

  onStart() {
    // Set status to RUNNING
    this.status = MissionStatus.RUNNING;
  }

  onEnd() {
    // file mission report
    Memory.missionReports.push({
      type: this.constructor.name,
      duration: Game.time - Memory.missions[this.id].started,
      cpuUsed: Memory.missions[this.id].cpuUsed,
      energyUsed: Memory.missions[this.id].energyUsed,
      finished: Game.time,
      office: this.missionData.office
    });
    // Clean up the mission
    delete Memory.missions[this.id];
  }

  cpuRemaining() {
    return Object.keys(this.creeps).reduce((sum, spawner) => this.creeps[spawner].cpuRemaining() + sum, 0);
  }
  cpuUsed() {
    return Memory.missions[this.id].cpuUsed;
  }
  energyRemaining() {
    return this.estimatedEnergyRemaining;
  }
  energyUsed() {
    return Memory.missions[this.id].energyUsed;
  }
  recordEnergy(energy: number) {
    Memory.missions[this.id].energyUsed += energy;
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
