import { roomPlans } from 'Selectors/roomPlans';

const capacity = (link: StructureLink | undefined) =>
  Math.max(0, (link?.store.getCapacity(RESOURCE_ENERGY) ?? 0) - (link?.store[RESOURCE_ENERGY] ?? 0));

export const runLinks = () => {
  for (let office in Memory.offices) {
    const plan = roomPlans(office);

    const hqlink = plan?.headquarters?.link.structure as StructureLink;
    const franchise1link = plan?.franchise1?.link.structure as StructureLink | undefined;
    const franchise2link = plan?.franchise2?.link.structure as StructureLink | undefined;
    const fastfillerlink = plan?.fastfiller?.link.structure as StructureLink | undefined;
    const librarylink = plan?.library?.link.structure as StructureLink | undefined;

    const destinations = [fastfillerlink, librarylink, hqlink]
      .filter((l): l is StructureLink => capacity(l) > LINK_CAPACITY / 2)
      .sort((a, b) => capacity(a) - capacity(b));

    for (const source of [franchise1link, franchise2link, hqlink]) {
      if (source?.store[RESOURCE_ENERGY] && !source.cooldown) {
        const destination = destinations.filter(d => d !== source).shift();
        if (destination) {
          if (source.transferEnergy(destination) === OK) {
            const transfer = Math.min(source.store[RESOURCE_ENERGY], capacity(destination));
            source.store[RESOURCE_ENERGY] -= transfer;
            destination.store[RESOURCE_ENERGY] += transfer * 0.97;
            if (capacity(destination)) destinations.unshift(destination);
          }
        }
      }
    }
  }
};
