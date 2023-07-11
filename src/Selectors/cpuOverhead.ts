import { CPU_ESTIMATE_PERIOD } from "config";

declare global {
  interface Memory {
    overhead: number;
  }
}

const overhead: number[] = new Array(CPU_ESTIMATE_PERIOD).fill(Memory.overhead ?? 0);

let missionCpu = 0;
export function recordMissionCpu(cpu: number) {
  missionCpu = cpu;
}

export function recordOverhead() {
  const cpuUsed = Game.cpu.getUsed();
  overhead.push(Math.max(0, cpuUsed - missionCpu));
  overhead.shift();
  Memory.overhead = cpuOverhead();
}

export function cpuOverhead() {
  return Game.cpu.limit * 0.4 // overhead.reduce((a, b) => a + b, 0) / overhead.length;
}
