import { FRANCHISE_EVALUATE_PERIOD, FRANCHISE_RETRY_INTERVAL } from 'config';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { franchiseActive } from 'Selectors/Franchises/franchiseActive';
import { planFranchisePath } from 'Selectors/Franchises/planFranchisePath';
import { remoteFranchises } from 'Selectors/Franchises/remoteFranchises';

export const scanTerritories = () => {
  for (const office in Memory.offices) {
    for (const { source, room } of remoteFranchises(office)) {
      // update paths, if needed
      planFranchisePath(office, source);

      const ledger = HarvestLedger.get(office, source);

      if (ledger.age < 1500 || !Memory.rooms[room].franchises[office]?.[source]) continue;

      Memory.rooms[room].franchises[office][source].scores ??= [];
      const { scores, lastActive: lastHarvested } = Memory.rooms[room].franchises[office][source];

      if (franchiseActive(office, source)) {
        // record score for previous 1500 ticks
        scores.push(ledger.perTick);
        if (scores.length > FRANCHISE_EVALUATE_PERIOD) scores.shift();

        console.log(office, room, source, JSON.stringify(ledger.value), scores);
      } else {
        // unprofitable franchise was abandoned - evaluate if scores should be reset
        if (
          scores.length === FRANCHISE_EVALUATE_PERIOD &&
          scores.reduce((a, b) => a + b, 0) / scores.length <= 1 &&
          lastHarvested &&
          lastHarvested < Game.time - FRANCHISE_RETRY_INTERVAL
        ) {
          // franchise was producing less than 1 e/t, but it's time to re-evaluate
          scores.splice(0, FRANCHISE_EVALUATE_PERIOD);
        }
      }

      HarvestLedger.reset(office, source);
    }
  }
};
