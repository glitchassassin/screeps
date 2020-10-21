export abstract class WorldData {
    public interval = 1;
    public fetched = new Map<string, number>();

    constructor() {
        // On reload, get fresh data,
        // or cached if not available
        for (let roomName in Game.rooms) {
            if (!this.update(roomName)) {
                this.getCached(roomName);
            }
        }
    }

    abstract update(roomName: string): boolean;
    abstract cache(roomName: string): boolean;
    abstract getCached(roomName: string): boolean;

    public run() {
        for (let roomName in Game.rooms) {
            if (Game.time - (this.fetched.get(roomName) ?? 0) >= this.interval) {
                if (this.update(roomName)) {
                    this.fetched.set(roomName, Game.time);
                    this.cache(roomName);
                }
            }
        }
    }
}
