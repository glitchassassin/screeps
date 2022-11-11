import { States } from 'Behaviors/states';
import { moveTo } from 'screeps-cartographer';

export const emptyLabs = (
  { waitForReaction, labs }: { office: string; labs: StructureLab[]; waitForReaction?: boolean },
  creep: Creep
) => {
  const threshold = waitForReaction ? 100 : 0;
  const target = labs.find(l => l.mineralType !== null && l.store.getUsedCapacity(l.mineralType) > threshold);
  const resource = target?.mineralType;
  if ((!waitForReaction && !resource) || creep.store.getFreeCapacity() === 0) {
    return States.DEPOSIT;
  } else if (!resource) {
    return States.EMPTY_LABS; // wait for reaction to collect more
  }
  moveTo(creep, { pos: target.pos, range: 1 });
  creep.withdraw(target, resource);
  return States.EMPTY_LABS;
};
