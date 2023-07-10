import { CPU_ESTIMATE_PERIOD } from 'config';
import { cpuOverhead } from './cpuOverhead';

export const missionCpuAvailable = (office: string) => {
  const baseCpu = Math.max(0, (Game.cpu.bucket - 500 + (Game.cpu.limit - cpuOverhead()) * CPU_ESTIMATE_PERIOD) * 0.5);
  const offices = Object.keys(Memory.offices).length;
  return baseCpu / offices;
};
