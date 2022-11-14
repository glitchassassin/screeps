import { LabMineralConstant } from 'Structures/Labs/LabOrder';
import { boostLabsToEmpty } from 'Structures/Labs/labsToEmpty';
import { getLabs } from './getLabs';
import { getScientists } from './getScientists';
import { roomPlans } from './roomPlans';

export function boostLabsToFill(office: string) {
  return getLabs(office)
    .boosts.map(lab => lab.structure)
    .filter((lab): lab is StructureLab => {
      if (!lab) return false;
      const boost = lab.mineralType;
      const [boostNeeded, quantity] = boostsNeededForLab(office, lab.id);
      return !boost || (boost == boostNeeded && lab.store.getUsedCapacity(boostNeeded) < (quantity ?? 0));
    });
}

export function boostsNeededForLab(
  office: string,
  labId: Id<StructureLab> | undefined
): [LabMineralConstant, number] | [] {
  const resource = Memory.offices[office].lab.boostingLabs.find(l => l.id === labId)?.resource;
  if (!resource || !labId) return [];

  const boostOrders = Memory.offices[office].lab.boosts;

  let boostCount = 0;

  for (const order of boostOrders) {
    // Subtract any already-boosted parts from the orders
    const c = Game.creeps[order.name];
    let orderResources = order.boosts.find(boost => boost.type === resource)?.count ?? 0;
    if (!c) continue;
    c.body.forEach(part => {
      if (part.boost === resource) orderResources -= LAB_BOOST_MINERAL;
    });

    boostCount += Math.max(0, orderResources);
  }

  // Cap at amount actually available in local economy

  boostCount = Math.min(boostCount, boostsAvailable(office, resource, false, false), LAB_MINERAL_CAPACITY);

  return [resource, boostCount];
}

export function shouldHandleBoosts(office: string) {
  return boostLabsToEmpty(office).length > 0 || boostLabsToFill(office).length > 0;
}

/**
 * Sum of boosts in labs, Scientist inventories, and Terminal
 */
export function boostsAvailable(office: string, boost: LabMineralConstant, subtractReserved = true, countLabs = true) {
  let total = roomPlans(office)?.headquarters?.terminal.structure?.store.getUsedCapacity(boost) ?? 0;
  total += getScientists(office).reduce((sum, creep) => sum + creep.store.getUsedCapacity(boost), 0);
  if (countLabs) {
    total += getLabs(office).boosts.reduce(
      (sum, lab) => ((lab.structure as StructureLab)?.store.getUsedCapacity(boost) ?? 0) + sum,
      0
    );
  }
  if (subtractReserved) {
    total -= Memory.offices[office].lab.boosts.reduce(
      (sum, o) => sum + (o.boosts.find(b => b.type === boost)?.count ?? 0),
      0
    );
  }
  return total;
}
