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
  office?: string
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
    [roomName: string]: import('./Analysts/StatisticsAnalyst').PipelineMetrics
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
    offices: {[id: string]: {
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
      controller: import('./Analysts/ControllerAnalyst').ControllerAnalyst,
      logistics: import('./Analysts/LogisticsAnalyst').LogisticsAnalyst,
      map: import('./Analysts/MapAnalyst').MapAnalyst,
      sales: import('./Analysts/SalesAnalyst').SalesAnalyst,
      spawn: import('./Analysts/HRAnalyst').HRAnalyst,
      facilities: import('./Analysts/FacilitiesAnalyst').FacilitiesAnalyst,
      defense: import('./Analysts/DefenseAnalyst').DefenseAnalyst,
      grafana: import('./Analysts/GrafanaAnalyst').GrafanaAnalyst,
      statistics: import('./Analysts/StatisticsAnalyst').StatisticsAnalyst,
    };
  }
}
