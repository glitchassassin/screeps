let log = new Map<string, [number, number]>();
let loggedTicks = 0;
let last = 0;
let reportedTick = 0;

export const logCpuStart = () => (last = Game.cpu.getUsed());
export const logCpu = (context: string) => {
  if (reportedTick !== Game.time) {
    for (let [c, data] of log) {
      const invocationsPerTick = data[0] / loggedTicks;
      const averagePerInvocation = data[1] / data[0];
      console.log(
        `${c}: ${invocationsPerTick.toFixed(3)} x ${averagePerInvocation.toFixed(3)} = ${(
          invocationsPerTick * averagePerInvocation
        ).toFixed(3)}`
      );
    }
    loggedTicks += 1;
    reportedTick = Game.time;
  }
  const [invocations, time] = log.get(context) ?? [0, 0];
  const cpu = Game.cpu.getUsed();
  log.set(context, [invocations + 1, time + Math.max(0, cpu - last)]);
  last = cpu;
};
