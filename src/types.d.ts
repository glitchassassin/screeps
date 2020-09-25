// example declaration file - remove these and add your own custom typings

// memory extension samples
interface CreepMemory {
  type?: string
  source?: string
  task?: string
  ignoresRequests?: boolean
  favoredTasks?: string[]
  spawned?: number
  arrived?: number
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
  metrics: {
    [roomName: string]: import('./analysts/StatisticsAnalyst').PipelineMetrics
  }
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
    rooms: {[id: string]: {
      taskManagement: {
        tasks: {[id: string]: number},
        requests: {[id: string]: number},
      },
      pipelineMetrics: {
        sourcesLevel: number,
        mineContainersLevel: number
      },
      controllerProgress: number,
      controllerProgressTotal: number,
      controllerLevel: number,
    }},
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
      grafana: import('./analysts/GrafanaAnalyst').GrafanaAnalyst,
      statistics: import('./analysts/StatisticsAnalyst').StatisticsAnalyst,
    };
    managers: {
      logistics: import('./managers/LogisticsManager').LogisticsManager,
      controller: import('./managers/ControllerManager').ControllerManager,
      source: import('./managers/SourceManager').SourceManager,
      builder: import('./managers/BuilderManager').BuilderManager,
      defense: import('./managers/DefenseManager').DefenseManager,
    };
    supervisors: {
      [id: string]: {
        task: import('./supervisors/TaskSupervisor').TaskSupervisor,
        spawn: import('./supervisors/SpawnSupervisor').SpawnSupervisor,
      }
    };
    architects: {
      controller: import('./architects/ControllerArchitect').ControllerArchitect,
      source: import('./architects/SourceArchitect').SourceArchitect,
      road: import('./architects/RoadArchitect').RoadArchitect,
    }
  }
}
