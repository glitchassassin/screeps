import { States } from 'Behaviors/states';
import { moveTo } from 'screeps-cartographer';
import { roomPlans } from 'Selectors/roomPlans';
import { LabOrder } from 'Structures/Labs/LabOrder';

export const deposit =
  (order?: LabOrder) =>
  ({ office }: { office: string }, creep: Creep) => {
    const terminal = roomPlans(office)?.headquarters?.terminal.structure;
    if (!terminal) return States.DEPOSIT;

    if (creep.store.getUsedCapacity() === 0) {
      return States.WITHDRAW;
    }
    const toDeposit = Object.keys(creep.store)[0] as ResourceConstant | undefined;
    if (!toDeposit) {
      // Nothing further to deposit
      return States.WITHDRAW;
    }
    moveTo(creep, { pos: terminal.pos, range: 1 });
    creep.transfer(terminal, toDeposit);
    if (order && toDeposit === order.output) {
      // Decrement output from the lab order
      order.amount -= creep.store.getUsedCapacity(toDeposit);
    }
    return States.DEPOSIT;
  };
