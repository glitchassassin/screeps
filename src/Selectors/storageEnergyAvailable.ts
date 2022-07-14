import { MissionType } from "Missions/Mission";
import { memoizeByTick } from "utils/memoizeFunction";
import { franchiseEnergyAvailable } from "./franchiseEnergyAvailable";
import { franchisesByOffice } from "./franchisesByOffice";
import { getPrimarySpawn } from "./getPrimarySpawn";
import { roomPlans } from "./roomPlans";

export const storageEnergyAvailable = (roomName: string) => {
    const plan = roomPlans(roomName)
    if (!plan?.headquarters) return 0;
    return (
        ((plan.headquarters.storage.structure as StructureStorage)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) +
        ((plan.headquarters.container.structure as StructureContainer)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) +
        (getPrimarySpawn(roomName)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0)
    )
}

export const roomEnergyAvailable = memoizeByTick(
    office => office,
    (office: string) => {
        const plan = roomPlans(office);
        return ((plan?.headquarters?.storage.structure as StructureStorage)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) +
            ((plan?.headquarters?.container.structure as StructureContainer)?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) +
            Game.rooms[office].energyAvailable
    }
)

export const energyInTransit = memoizeByTick(
    office => office,
    (office: string) => {
        // calculate fleet energy levels
        let fleetEnergy = 0
        let fleetCapacity = 0;
        for (const mission of Memory.offices[office].activeMissions) {
            if (mission.type !== MissionType.LOGISTICS) continue;
            const creep = Game.creeps[mission.creepNames[0] ?? ''];
            fleetEnergy += creep?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0;
            fleetCapacity += creep?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0;
        }

        // calculate franchise energy levels
        const franchiseEnergy = franchisesByOffice(office).reduce((sum, { source }) => sum + franchiseEnergyAvailable(source), 0)
        return fleetEnergy + Math.min(fleetCapacity, franchiseEnergy);
    }
)
