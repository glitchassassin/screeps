// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
  type?: string
  source?: string
  task?: string
  ignoresRequests?: boolean
  favoredTasks?: string[]
}

interface FlagMemory {
  source?: string;
  upgradeDepot?: boolean;
}

interface RoomMemory {
  tasks?: string;
  requests?: string;
  spawnRequests?: string;
}

interface Memory {
  uuid: number;
  log: any;
  stats: {
    gcl: {
      progress: number,
      progressTotal: number,
      level: number
    },
    cpu: {
      bucket: number,
      limit: number,
      used: number
    },
    rooms: {
      storageEnergy: number,
      terminalEnergy: number,
      energyAvailable: number,
      energyCapacityAvailable: number,
      controllerProgress: number,
      controllerProgressTotal: number,
      controllerLevel: number,
    }[],
    time: number,
  }
}

// `global` extension samples
declare namespace NodeJS {
  interface Global {
    log: any;
    analysts: {
      controller: import('./analysts/ControllerAnalyst').ControllerAnalyst,
      logistics: import('./analysts/LogisticsAnalyst').LogisticsAnalyst,
      map: import('./analysts/MapAnalyst').MapAnalyst,
      source: import('./analysts/SourceAnalyst').SourceAnalyst,
      spawn: import('./analysts/SpawnAnalyst').SpawnAnalyst,
      builder: import('./analysts/BuilderAnalyst').BuilderAnalyst,
      defense: import('./analysts/DefenseAnalyst').DefenseAnalyst,
    };
    managers: {
      logistics: import('./managers/LogisticsManager').LogisticsManager,
      controller: import('./managers/ControllerManager').ControllerManager,
      source: import('./managers/SourceManager').SourceManager,
      builder: import('./managers/BuilderManager').BuilderManager,
      defense: import('./managers/DefenseManager').DefenseManager,
    };
    supervisors: {
      task: import('./supervisors/TaskSupervisor').TaskSupervisor,
      spawn: import('./supervisors/SpawnSupervisor').SpawnSupervisor,
    }
  }
}
