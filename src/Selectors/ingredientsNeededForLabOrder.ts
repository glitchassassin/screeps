import { LabOrder } from 'Structures/Labs/LabOrder';
import { getLabs } from './getLabs';

export function ingredientsNeededForLabOrder(office: string, order: LabOrder, scientists: Creep[]) {
  // In Process ingredients are in Scientists' inventories or input labs
  // In Process products are in Scientists' inventories or output labs
  const { inputs, outputs } = getLabs(office);

  const product =
    scientists.reduce((sum, c) => sum + c.store.getUsedCapacity(order.output), 0) +
    outputs.reduce((sum, c) => sum + ((c.structure as StructureLab)?.store.getUsedCapacity(order.output) ?? 0), 0);

  const ingredient1 =
    scientists.reduce((sum, c) => sum + c.store.getUsedCapacity(order.ingredient1), 0) +
    inputs.reduce((sum, c) => sum + ((c.structure as StructureLab)?.store.getUsedCapacity(order.ingredient1) ?? 0), 0);

  const ingredient2 =
    scientists.reduce((sum, c) => sum + c.store.getUsedCapacity(order.ingredient2), 0) +
    inputs.reduce((sum, c) => sum + ((c.structure as StructureLab)?.store.getUsedCapacity(order.ingredient2) ?? 0), 0);

  const target = order.amount - product;

  const roundToNextHighest = (increment: number, value: number) => Math.ceil(value / increment) * increment;

  return {
    ingredient1: roundToNextHighest(5, target - ingredient1),
    ingredient2: roundToNextHighest(5, target - ingredient2)
  };
}
