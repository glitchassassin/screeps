import { getLabs } from 'Selectors/getLabs';
import { LabOrder } from './LabOrder';

export function boostLabsToEmpty(office: string) {
  return getLabs(office)
    .boosts.map(lab => lab.structure)
    .filter((lab): lab is StructureLab => {
      if (!lab) return false;
      const target = Memory.offices[office].lab.boostingLabs.find(o => o.id === lab.id)?.resource;
      const actual = lab.mineralType;
      return Boolean(actual && actual !== target);
    });
}

export function reactionLabsToEmpty(office: string) {
  const order = Memory.offices[office].lab.orders.find(o => o.amount > 0) as LabOrder | undefined;
  const { inputs, outputs } = getLabs(office);
  const outputLabs = outputs.map(s => s.structure).filter((s): s is StructureLab => !!s?.mineralType);
  const [lab1, lab2] = inputs.map(s => s.structure);

  const labs = outputLabs;
  if (
    lab1?.mineralType &&
    (lab1.mineralType !== order?.ingredient1 || (lab1?.store.getUsedCapacity(lab1.mineralType) ?? 0) < 5)
  )
    labs.push(lab1);
  if (
    lab2?.mineralType &&
    (lab2?.mineralType !== order?.ingredient2 || (lab2?.store.getUsedCapacity(lab2.mineralType) ?? 0) < 5)
  )
    labs.push(lab2);
  return labs;
}
