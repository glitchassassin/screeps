import { States } from 'Behaviors/states';
import { moveTo } from 'screeps-cartographer';

export const emptyLabs = ({ office, labs }: { office: string; labs: StructureLab[] }, creep: Creep) => {
  const target = labs.find(l => l.mineralType !== null);
  const resource = target?.mineralType;
  if (!resource || creep.store.getFreeCapacity() === 0) {
    return States.DEPOSIT;
  }
  moveTo(creep, { pos: target.pos, range: 1 });
  creep.withdraw(target, resource);
  return States.EMPTY_LABS;
};
