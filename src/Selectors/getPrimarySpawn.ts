import { roomPlans } from "./roomPlans";

export const getPrimarySpawn = (roomName: string) => {
    const plan = roomPlans(roomName)
    return (plan?.headquarters?.spawn.structure ?? plan?.franchise1?.spawn.structure ?? plan?.franchise2?.spawn.structure) as StructureSpawn | undefined
}
