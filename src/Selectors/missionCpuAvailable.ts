import { cpuOverhead } from './cpuOverhead';

export const cpuEstimatePeriod = () => 10000 / Game.cpu.limit;

export const missionCpuAvailable = (office: string) => {
  const baseCpu = Math.max(0, (Game.cpu.bucket - 500 + (Game.cpu.limit - cpuOverhead()) * cpuEstimatePeriod()) * 0.5);
  const offices = Object.keys(Memory.offices).length;
  return baseCpu / offices;
};
