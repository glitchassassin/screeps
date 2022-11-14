import { States } from 'Behaviors/states';
import { getLabs } from 'Selectors/getLabs';

export function runLabLogic(roomName: string) {
  // Set boosting labs for all queued resources
  const newBoostingLabs: {
    id: Id<StructureLab>;
    resource: MineralBoostConstant;
  }[] =
    Memory.offices[roomName].lab.boostingLabs.filter(({ resource }) =>
      Memory.offices[roomName].lab.boosts.some(o => o.boosts.some(b => b.type === resource))
    ) ?? [];
  set_boosting_labs: for (const order of Memory.offices[roomName].lab.boosts) {
    if (Memory.creeps[order.name]?.runState !== States.GET_BOOSTED) {
      // either undefined, if creep is dead, or something else, if state changed
      // either way, scrap the boost order
      Memory.offices[roomName].lab.boosts = Memory.offices[roomName].lab.boosts.filter(o => o.name !== order.name);
      continue;
    }
    if (Game.creeps[order.name]?.spawning) continue; // creep is not dead, so is still spawning
    for (let boost of order.boosts) {
      const boostingLab = newBoostingLabs.find(l => l.resource === boost.type);
      if (boostingLab && !newBoostingLabs.includes(boostingLab)) {
        newBoostingLabs.push(boostingLab);
      } else if (!newBoostingLabs.some(l => l.resource === boost.type)) {
        // dedicate an available lab
        const labs = getLabs(roomName);
        const availableLab = labs.inputs
          .concat(labs.outputs)
          .filter(l => l.structureId && !newBoostingLabs.some(bl => bl.id === l.structureId))
          .slice(-1)[0];
        if (!availableLab) break set_boosting_labs;
        newBoostingLabs.push({
          id: availableLab.structureId as Id<StructureLab>,
          resource: boost.type
        });
      }
    }
  }
  Memory.offices[roomName].lab.boostingLabs = newBoostingLabs;

  // Run reaction orders
  const order = Memory.offices[roomName].lab.orders[0];
  if (!order) return;
  const { inputs, outputs } = getLabs(roomName);
  const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab | undefined)[];
  if (!lab1?.store.getUsedCapacity(order.ingredient1) || !lab2?.store.getUsedCapacity(order.ingredient2)) return;
  for (let lab of outputs) {
    const result = (lab.structure as StructureLab | undefined)?.runReaction(lab1, lab2);
    if (result === OK) break;
    // if (result !== undefined) console.log('lab result:', result);
  }
}
