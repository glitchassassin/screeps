export enum MissionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  CLEANUP = 'CLEANUP'
}

export function generateMissionId() {
  return Number(Math.floor(Math.random() * 0xffffffff))
    .toString(16)
    .padStart(8, '0');
}
