export enum MissionType {
  HARVEST = 'HARVEST',
}

export enum MissionStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  STARTING = 'STARTING',
  RUNNING = 'RUNNING',
  CANCELED = 'CANCELED',
  DONE = 'DONE',
}

export interface Mission<T extends MissionType, D> {
  office: string,
  priority: number,
  type: T,
  status: MissionStatus,
  creepNames: string[],
  startTime?: number,
  data: D,
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

export interface MissionWithoutDefaults<T extends MissionType, D> {
  office: string,
  priority: number,
  type: T,
  startTime?: number,
  data: D,
  // Budgeting
  estimate: {
    cpu: number,
    energy: number,
  },
}

export function createMission<T extends MissionType, D>(mission: MissionWithoutDefaults<T, D>) {
  return {
    status: MissionStatus.PENDING,
    creepNames: [],
    actual: {
      cpu: 0,
      energy: 0,
    },
    ...mission
  }
}
