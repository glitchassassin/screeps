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
  offices: {
    [name: string]: {
      franchiseLocations: {
        [sourceId: string]: RoomPosition
      },
      territories: {
        [roomName: string]: {
          controller: RoomPosition|undefined,
          sources: {[id: string]: RoomPosition},
          scanned: boolean
        }
      }
    }
  }
  tasks: {
    [officeName: string]: {
      tasks: string,
      requests: string
    }
  };
  metrics: {
    [roomName: string]: import('./Boardroom/BoardroomManagers/StatisticsAnalyst').PipelineMetrics
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
    IS_JEST_TEST: boolean;
    log: any;
    boardroom: import('./Boardroom/Boardroom').Boardroom;
    taskReport: Function;
    taskPurge: Function;
    officeReport: Function;
    hrReport: Function;
  }
}
