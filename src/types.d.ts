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
}

interface Memory {
  uuid: number;
  log: any;
  hr: {
    [officeName: string]: string
  };
  tasks: {
    [officeName: string]: {
      tasks: string,
      requests: string
    }
  };
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
    boardroom: import('./Boardroom/Boardroom').Boardroom;
    analysts: {
      controller: import('./analysts/ControllerAnalyst').ControllerAnalyst,
      logistics: import('./analysts/LogisticsAnalyst').LogisticsAnalyst,
      map: import('./analysts/MapAnalyst').MapAnalyst,
      sales: import('./analysts/SalesAnalyst').SalesAnalyst,
      spawn: import('./analysts/SpawnAnalyst').SpawnAnalyst,
      facilities: import('./analysts/FacilitiesAnalyst').FacilitiesAnalyst,
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
