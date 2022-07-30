import { getSpawns } from "./roomPlans";

export const getPrimarySpawn = (roomName: string) => {
    return getSpawns(roomName)[0]
}
