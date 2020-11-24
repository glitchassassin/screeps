// example declaration file - remove these and add your own custom typings

// From https://github.com/screepers/RoomVisual
interface RoomVisual {
  structure(x: number, y: number, structureType: StructureConstant): RoomVisual
  speech(text: string, x: number, y: number): RoomVisual
  animatedPosition(x: number, y: number): RoomVisual
  resource(type: ResourceConstant, x: number, y: number): RoomVisual
  connectRoads(): RoomVisual
}

interface RawMemory {
  _parsed: Memory
}

// memory extension samples
interface CreepMemory {
  type?: string
  source?: string
  manager?: string
  favoredTasks?: string[]
  spawned?: number
  arrived?: number
  office?: string
  depot?: boolean
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
  logs: {[context: string]: string};
  respawnTick: number;
  cities: string[];
  boardroom: {
    [managerName: string]: any
  }
  hr: {
    [officeName: string]: string
  };
  offices: {
    [name: string]: {
      city: string,
      employees: string[],
      franchiseLocations: {
        [sourceId: string]: {
          franchise: RoomPosition,
          source: RoomPosition
        }
      },
      territories: {
        [roomName: string]: {
          controller: {
            pos?: RoomPosition,
            my?: boolean,
          },
          sources: {[id: string]: RoomPosition},
          scanned: number,
          lastHostileActivity?: number
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

declare namespace GreyCompany {
  interface Heap { }
}
// `global` extension samples
declare namespace NodeJS {
  interface Global {
    IS_JEST_TEST: boolean;
    log: any;
    boardroom: import('./Boardroom/Boardroom').Boardroom;
    v: import('./utils/VisualizationController').VisualizationController;
    taskReport: Function;
    taskPurge: Function;
    officeReport: Function;
    hrReport: Function;
    purge: Function;
    reportCPU: Function;
    debug: {[id: string]: boolean}
    Memory?: Memory
    worldState: import('./WorldState/WorldState').WorldState
    lastGlobalReset: number
    Heap: GreyCompany.Heap
  }
}
