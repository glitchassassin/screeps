export const missionCpuAvailable = (office: string) => {
  const baseCpu = Game.cpu.bucket + (Game.cpu.limit * CREEP_LIFE_TIME);
  const offices = Object.keys(Memory.offices).length;
  return (baseCpu / offices);
}
