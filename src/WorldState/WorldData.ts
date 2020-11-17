import { keyByName, memoryCache } from "screeps-cache";

export abstract class WorldData {
    public get name() : string {
        return this.constructor.name;
    }

    // Store linked IDs in memory, to reload data from
    @memoryCache(keyByName)
    public ids!: string[];

    abstract update(roomName: string): boolean

    public run() {
        for (let room in Game.rooms) {
            this.update(room);
        }
    }

    delete(id: string) {
        this.ids = this.ids.filter(i => i !== id);
        delete Memory.cache[id];
    }
}
