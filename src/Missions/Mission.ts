export enum MissionType {
  ACQUIRE = 'ACQUIRE',
  DEFEND = 'DEFEND',
  EXPLORE = 'EXPLORE',
  BUILD = 'BUILD',
  HEADQUARTERS = 'HEADQUARTERS',
  LOGISTICS = 'LOGISTICS',
  MINE = 'MINE',
  PLUNDER = 'PLUNDER',
  REFILL = 'REFILL',
  SCIENCE = 'SCIENCE',
  TOWERS = 'TOWERS',
  TRADE = 'TRADE',
  UPGRADE = 'UPGRADE',
  HARVEST = 'HARVEST',
}

export enum MissionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  CANCELED = 'CANCELED',
  DONE = 'DONE',
}

export interface Mission<T extends MissionType, D> {
  office: string,
  priority: number,
  type: T,
  status: MissionStatus,
  creeps: Id<Creep>[],
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
    creeps: [],
    actual: {
      cpu: 0,
      energy: 0,
    },
    ...mission
  }
}
