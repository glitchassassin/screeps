import { cpuOverhead } from './cpuOverhead';

export const missionCpuAvailable = (office: string) => {
  const baseCpu = Game.cpu.bucket + Math.max(0, (Game.cpu.limit - cpuOverhead()) * CREEP_LIFE_TIME * 0.8);
  const offices = Object.keys(Memory.offices).length;
  return baseCpu / offices;
};
