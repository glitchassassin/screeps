import profiler from "screeps-profiler";
import { roomPlans } from "Selectors/roomPlans";

const linkUsedCapacity = (link: StructureLink|undefined) => {
    if (!link) return 0;
    return link.store.getUsedCapacity(RESOURCE_ENERGY) / link.store.getCapacity(RESOURCE_ENERGY)
}

export const runLinks = profiler.registerFN((roomName: string) => {
    const plan = roomPlans(roomName)?.office;
    if (!plan || !plan.headquarters.link.structure) return;

    const hqlink = plan.headquarters.link.structure as StructureLink;
    const franchise1link = plan.franchise1.link.structure as StructureLink|undefined;
    const franchise2link = plan.franchise2.link.structure as StructureLink|undefined;

    if (linkUsedCapacity(franchise1link) > 0.8) {
        franchise1link!.transferEnergy(hqlink);
    }
    if (linkUsedCapacity(franchise2link) > 0.8) {
        franchise2link!.transferEnergy(hqlink);
    }
}, 'runLinks')
