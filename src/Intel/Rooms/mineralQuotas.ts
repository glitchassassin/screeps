import { MINERALS } from 'gameConstants';
import { ScannedRoomEvent } from 'Intel/events';
import { ownedMinerals } from 'Selectors/ownedMinerals';

export const mineralQuotas = ({ room, office }: ScannedRoomEvent) => {
  if (!office) return;
  // Temporary quotas for minerals
  for (let m of ownedMinerals()) {
    Memory.offices[room].resourceQuotas[m as ResourceConstant] = 3000;
  }
  for (let o of Memory.offices[room].lab.orders) {
    if (MINERALS.includes(o.ingredient1)) {
      Memory.offices[room].resourceQuotas[o.ingredient1] = 3000;
    }
    if (MINERALS.includes(o.ingredient2)) {
      Memory.offices[room].resourceQuotas[o.ingredient2] = 3000;
    }
  }
};
