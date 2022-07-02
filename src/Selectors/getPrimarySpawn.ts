import { getSpawns, roomPlans } from "./roomPlans";

export const getPrimarySpawn = (roomName: string) => {
    const plan = roomPlans(roomName)
    return plan ?
        (plan?.headquarters?.spawn.structure ?? plan?.franchise1?.spawn.structure ?? plan?.franchise2?.spawn.structure) as StructureSpawn | undefined :
        getSpawns(roomName)[0]
}
