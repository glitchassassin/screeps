import { States } from 'Behaviors/states';
import { moveTo } from 'screeps-cartographer';
import { LabMineralConstant } from 'Structures/Labs/LabOrder';

export const fillLabs = (
  { fillOrders }: { fillOrders: [StructureLab, LabMineralConstant, number][] },
  creep: Creep
) => {
  for (const [lab, resource, amount] of fillOrders) {
    const hasAmount = creep.store.getUsedCapacity(resource);
    if (hasAmount) {
      moveTo(creep, lab);
      creep.transfer(lab, resource, Math.min(amount, hasAmount, lab.store.getFreeCapacity(resource)));
      return States.FILL_LABS;
    }
  }
  return States.EMPTY_LABS; // nothing left to fill
};
