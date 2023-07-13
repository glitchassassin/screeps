import { estimatedFreeCapacity, estimatedUsedCapacity, updateUsedCapacity } from 'Selectors/Logistics/predictiveCapacity';
import { roomPlans } from 'Selectors/roomPlans';

export const runLinks = () => {
  for (let office in Memory.offices) {
    const plan = roomPlans(office);

    const hqlink = plan?.headquarters?.link.structure as StructureLink;
    const franchise1link = plan?.franchise1?.link.structure as StructureLink | undefined;
    const franchise2link = plan?.franchise2?.link.structure as StructureLink | undefined;
    const fastfillerlink = plan?.fastfiller?.link.structure as StructureLink | undefined;
    const librarylink = plan?.library?.link.structure as StructureLink | undefined;

    const destinations = [fastfillerlink, librarylink, hqlink]
      .filter((l): l is StructureLink => estimatedFreeCapacity(l) > LINK_CAPACITY / 2)
      .sort((a, b) => estimatedFreeCapacity(a) - estimatedFreeCapacity(b));

    for (const source of [
      franchise1link,
      franchise2link,
      hqlink
    ].filter(l => estimatedUsedCapacity(l) > CARRY_CAPACITY)) {
      if (source && estimatedUsedCapacity(source) && !source.cooldown) {
        const destination = destinations.filter(d => d !== source).shift();
        if (destination) {
          if (source.transferEnergy(destination) === OK) {
            const transfer = Math.min(estimatedUsedCapacity(source), estimatedFreeCapacity(destination));
            updateUsedCapacity(source, -transfer);
            updateUsedCapacity(destination, transfer * 0.97);
            if (estimatedFreeCapacity(destination)) destinations.unshift(destination);
          }
        }
      }
    }
  }
};
