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
    lastHostileActivity?: number;

    constructor(
        public name: string
    ) {}

    public get room() : Room|undefined {
        return Game.rooms[this.name];
    }


    public get isHostile() : boolean {
        return (!!this.lastHostileActivity)
    }


    scan() {
        if (!this.room) return;

        this.room.find(FIND_SOURCES).forEach(s => this.sources.set(s.id, s.pos));
        this.controller = {
            pos: this.room.controller?.pos,
            my: this.room.controller?.my,
            owner: this.room.controller?.owner?.username || this.room.controller?.reservation?.username,
        }
        this.scanned = true;
        let events = this.room.getEventLog();
        if (this.controller.owner && !this.controller.my) {
            this.lastHostileActivity = Game.time;
        } else if (this.room.find(FIND_STRUCTURES).some(s => s.structureType === STRUCTURE_KEEPER_LAIR)) {
            this.lastHostileActivity = Game.time;
        } else if (events.some(e => e.event === EVENT_ATTACK || e.event === EVENT_ATTACK_CONTROLLER)) {
            this.lastHostileActivity = Game.time;
        }
    }
}

export class RoomIntelligence extends TerritoryIntelligence {

    public get room() : Room {
        return Game.rooms[this.name];
    }

}
