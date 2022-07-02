export enum MissionType {
  HARVEST = 'HARVEST',
  LOGISTICS = 'LOGISTICS',
  EXPLORE = 'EXPLORE',
  ENGINEER = 'ENGINEER',
  REFILL = 'REFILL',
  UPGRADE = 'UPGRADE',
  RESERVE = 'RESERVE'
}

export enum MissionStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  CANCELED = 'CANCELED',
  DONE = 'DONE',
}

export interface Mission<T extends MissionType> {
  id: string,
  replacement?: string,
  office: string,
  priority: number,
  type: T,
  status: MissionStatus,
  creepNames: string[],
  startTime?: number,
  data: any,
  // Budgeting
  estimate: {
    cpu: number,
    energy: number,
  },
  actual: {
    cpu: number,
    energy: number,
  },
}

export interface MissionWithoutDefaults<T extends MissionType> {
  office: string,
  priority: number,
  type: T,
  startTime?: number,
  data: any,
  // Budgeting
  estimate: {
    cpu: number,
    energy: number,
  },
}

function generateMissionId() {
  return Number(Math.floor(Math.random() * 0xffffffff)).toString(16).padStart(8, '0');
}

export function createMission<T extends MissionType>(mission: MissionWithoutDefaults<T>) {
  return {
    id: generateMissionId(),
    status: MissionStatus.PENDING,
    creepNames: [],
    actual: {
      cpu: 0,
      energy: 0,
    },
    ...mission
  }
}