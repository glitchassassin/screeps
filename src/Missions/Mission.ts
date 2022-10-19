export enum MissionType {
  HARVEST = 'HARVEST',
  LOGISTICS = 'LOGISTICS',
  HQ_LOGISTICS = 'HQ_LOGISTICS',
  EXPLORE = 'EXPLORE',
  ENGINEER = 'ENGINEER',
  REFILL = 'REFILL',
  MOBILE_REFILL = 'MOBILE_REFILL',
  UPGRADE = 'UPGRADE',
  RESERVE = 'RESERVE',
  // TOWER_LOGISTICS = 'TOWER_LOGISTICS',
  PLUNDER = 'PLUNDER',
  MINE_FOREMAN = 'MINE_FOREMAN',
  MINE_HAULER = 'MINE_HAULER',
  SCIENCE = 'SCIENCE',
  ACQUIRE_ENGINEER = 'ACQUIRE_ENGINEER',
  // ACQUIRE_LOGISTICS = 'ACQUIRE_LOGISTICS',
  ACQUIRE_LAWYER = 'ACQUIRE_LAWYER',
  DEFEND_REMOTE = 'DEFEND_REMOTE',
  DEFEND_OFFICE = 'DEFEND_OFFICE'
}

export enum MissionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  DONE = 'DONE'
}

export interface Mission<T extends MissionType> {
  id: string;
  creep?: string;
  replacement?: string;
  office: string;
  priority: number;
  type: T;
  status: MissionStatus;
  startTime?: number;
  data: any;
  // Budgeting
  estimate: {
    cpu: number;
    energy: number;
  };
  actual: {
    cpu: number;
    energy: number;
  };
  efficiency: {
    running: number;
    working: number;
  };
}

declare global {
  interface CreepMemory {
    mission: Mission<MissionType>;
  }
}

export interface MissionWithoutDefaults<T extends MissionType> {
  office: string;
  priority: number;
  type: T;
  startTime?: number;
  data: any;
  // Budgeting
  estimate: {
    cpu: number;
    energy: number;
  };
}

export function generateMissionId() {
  return Number(Math.floor(Math.random() * 0xffffffff))
    .toString(16)
    .padStart(8, '0');
}

export function createMission<T extends MissionType>(mission: MissionWithoutDefaults<T>) {
  return {
    id: generateMissionId(),
    status: MissionStatus.PENDING,
    actual: {
      cpu: 0,
      energy: 0
    },
    efficiency: {
      running: 0,
      working: 0
    },
    ...mission
  };
}
