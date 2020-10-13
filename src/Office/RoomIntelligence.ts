type ControllerIntelligence = {
    pos?: RoomPosition,
    my?: boolean,
    owner?: string,
    reservation?: ReservationDefinition,
    level?: number,
    blocked?: number,
}

export class TerritoryIntelligence {
    sources: Map<Id<Source>, RoomPosition> = new Map();
    controller: ControllerIntelligence = {};
    scanned = 0;
    lastHostileActivity?: number;
    hostileSpawns = 0;
    hostileMinions = 0;

    constructor(
        public name: string
    ) {}

    public get room() : Room|undefined {
        return Game.rooms[this.name];
    }


    public get isHostile() : boolean {
        return (this.lastHostileActivity !== undefined)
    }


    scan() {
        if (!this.room) return;

        this.room.find(FIND_SOURCES).forEach(s => this.sources.set(s.id, s.pos));
        this.hostileSpawns = this.room.find(FIND_HOSTILE_SPAWNS).length;
        this.hostileMinions = this.room.find(FIND_HOSTILE_CREEPS).length;
        this.controller = {
            pos: this.room.controller?.pos,
            my: this.room.controller?.my,
            owner: this.room.controller?.owner?.username || this.room.controller?.reservation?.username,
            level: this.room.controller?.level,
            blocked: this.room.controller?.upgradeBlocked
        }
        this.scanned = Game.time;
        let events = this.room.getEventLog();
        if (
            (this.controller.owner && !this.controller.my) ||
            (this.room.find(FIND_STRUCTURES).some(s => s.structureType === STRUCTURE_KEEPER_LAIR)) //||
            // (events.some(e => e.event === EVENT_ATTACK || e.event === EVENT_ATTACK_CONTROLLER))
        ) {
            this.lastHostileActivity = Game.time;
        } else {
            this.lastHostileActivity = undefined;
        }
    }
}

export class RoomIntelligence extends TerritoryIntelligence {

    public get room() : Room {
        return Game.rooms[this.name];
    }

    public get isHostile() : boolean {
        return false;
    }

}
