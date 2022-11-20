declare global {
  interface Memory {
    overhead: number;
  }
}

const overhead: number[] = new Array(500).fill(Memory.overhead ?? 0);

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
  return overhead.reduce((a, b) => a + b, 0) / overhead.length;
}
