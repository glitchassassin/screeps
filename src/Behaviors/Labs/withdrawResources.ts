import { States } from 'Behaviors/states';
import { moveTo } from 'screeps-cartographer';
import { roomPlans } from 'Selectors/roomPlans';
import { LabMineralConstant } from 'Structures/Labs/LabOrder';

export const withdrawResourcesFromTerminal = (
  { office, withdrawResources }: { office: string; withdrawResources: [LabMineralConstant, number][] },
  creep: Creep
) => {
  const terminal = roomPlans(office)?.headquarters?.terminal.structure;
  if (!terminal) return States.WITHDRAW;

  moveTo(creep, { pos: terminal.pos, range: 1 });

  if (creep.pos.inRangeTo(terminal, 1)) {
    if (creep.store.getFreeCapacity() > 0) {
      for (const [resource, needed] of withdrawResources) {
        if (creep.store.getUsedCapacity(resource) >= needed || !terminal.store.getUsedCapacity(resource)) continue;
        // Need to get some of this resource
        creep.withdraw(
          terminal,
          resource,
          Math.min(needed, creep.store.getFreeCapacity(), terminal.store.getUsedCapacity(resource))
        );
        return States.WITHDRAW;
      }
      // No more resources to get
    }
    return States.FILL_LABS;
  }

  return States.WITHDRAW;
};
