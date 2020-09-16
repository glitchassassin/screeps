// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
  type?: string
  source?: string
  task?: string
}

interface FlagMemory {
  source?: string;
  upgradeDepot?: boolean;
}

interface RoomMemory {
  tasks?: string;
  requests?: string;
}

interface Memory {
  uuid: number;
  log: any;
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
    };
    managers: {
      controller: import('./managers/ControllerManager').ControllerManager,
      source: import('./managers/SourceManager').SourceManager,
      spawn: import('./managers/SpawnManager').SpawnManager,
      task: import('./managers/TaskManager').TaskManager,
      builder: import('./managers/BuilderManager').BuilderManager,
    };
  }
}
