import { roomPlans } from 'Selectors/roomPlans';

export const runPowerSpawn = () => {
  for (const office in Memory.offices) {
    const powerSpawn = roomPlans(office)?.headquarters?.powerSpawn.structure as StructurePowerSpawn | undefined;
    powerSpawn?.processPower();
  }
};
