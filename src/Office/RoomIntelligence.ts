export class TerritoryIntelligence {
    sources: Map<Id<Source>, RoomPosition> = new Map();
    controller: RoomPosition|undefined;
    scanned = false;

    constructor(
        public name: string
    ) {}

    public get room() : Room|undefined {
        return Game.rooms[this.name];
    }

    scan() {
        if (!this.scanned && this.room) {
            this.room.find(FIND_SOURCES).forEach(s => this.sources.set(s.id, s.pos));
            this.controller = this.room.controller?.pos;
            this.scanned = true;
        }
    }
}

export class RoomIntelligence extends TerritoryIntelligence {

    public get room() : Room {
        return Game.rooms[this.name];
    }

}
