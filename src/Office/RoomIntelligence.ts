type ControllerIntelligence = {
    pos?: RoomPosition,
    my?: boolean,
    owner?: string,
    reservation?: ReservationDefinition
}

export class TerritoryIntelligence {
    sources: Map<Id<Source>, RoomPosition> = new Map();
    controller: ControllerIntelligence = {};
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
            this.controller = {
                pos: this.room.controller?.pos,
                my: this.room.controller?.my,
                owner: this.room.controller?.owner?.username,
            }
            this.scanned = true;
        }
    }
}

export class RoomIntelligence extends TerritoryIntelligence {

    public get room() : Room {
        return Game.rooms[this.name];
    }

}
