import { roomPlans } from 'Selectors/roomPlans';

export function getWithdrawLimit(office: string, budget: Budget) {
  return getBudgetAdjustment(office, budget);
}

export enum Budget {
  ESSENTIAL = 'ESSENTIAL',
  ECONOMY = 'ECONOMY',
  EFFICIENCY = 'EFFICIENCY',
  SURPLUS = 'SURPLUS'
}

/**
 * Sets capacity threshold for different mission types, to make sure certain
 * missions can spawn only when storage levels are high enough - storage must
 * have `capacity` + `missionCost` to spawn mission
 */
export function getBudgetAdjustment(office: string, budget: Budget) {
  if (!roomPlans(office)?.headquarters?.storage.structure) {
    // No storage yet - minimal capacities enforced, except for income missions
    if ([Budget.ESSENTIAL, Budget.ECONOMY].includes(budget)) {
      return -Infinity;
    } else {
      return 0;
    }
  } else {
    // Storage allows more fine-grained capacity management
    if ([Budget.ESSENTIAL, Budget.ECONOMY].includes(budget)) {
      return -Infinity;
    } else if ([Budget.EFFICIENCY].includes(budget)) {
      return Game.rooms[office].energyCapacityAvailable ?? 1500;
    } else if ([Budget.SURPLUS].includes(budget)) {
      return 100000;
    } else {
      return 60000;
    }
  }
}
