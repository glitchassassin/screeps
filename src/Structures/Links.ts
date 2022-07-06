import { linkUsedCapacity } from "Selectors/linkUsedCapacity";
import { roomPlans } from "Selectors/roomPlans";

export const runLinks = () => {
  for (let office in Memory.offices) {
    const plan = roomPlans(office);
    if (!plan?.headquarters?.link.structure) return;

    const hqlink = plan.headquarters.link.structure as StructureLink;
    const franchise1link = plan.franchise1?.link.structure as StructureLink | undefined;
    const franchise2link = plan.franchise2?.link.structure as StructureLink | undefined;

    if (linkUsedCapacity(franchise1link) > 0.8) {
      franchise1link!.transferEnergy(hqlink);
    }
    if (linkUsedCapacity(franchise2link) > 0.8) {
      franchise2link!.transferEnergy(hqlink);
    }
  }
}
