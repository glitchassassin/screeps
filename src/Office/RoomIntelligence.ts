import { DefenseAnalyst, TerritoryIntent } from "Analysts/DefenseAnalyst";

export type ControllerIntelligence = {
    pos?: RoomPosition,
    my?: boolean,
    myReserved?: boolean,
    owner?: string,
    reserver?: string,
    reservation?: ReservationDefinition,
    level?: number,
    blocked?: number,
    scanned?: number
}

export class TerritoryIntelligence {
    scannedSources = false;
    scannedMinerals = false;
    sources: Map<Id<Source>, RoomPosition> = new Map();
    mineral?: MineralConstant;
    controller: ControllerIntelligence = {};
    scanned = 0;
    lastHostileActivity?: number;
    hostileStructures = 0;
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

    public get intent(): TerritoryIntent {
        return DefenseAnalyst.getTerritoryIntent(this.name);
    }

    scan() {
        if (!this.room) return;

        if (!this.scannedSources) {
            this.room.find(FIND_SOURCES).forEach(s => this.sources.set(s.id, s.pos));
            this.scannedSources = true;
        }
        if (!this.scannedMinerals) {
            this.room.find(FIND_MINERALS).forEach(m => this.mineral = m.mineralType);
            this.scannedMinerals = true;
        }
        this.controller = {
            pos: this.room.controller?.pos,
            my: this.room.controller?.my,
            myReserved: this.room.controller?.reservation?.username === 'LordGreywether',
            owner: this.room.controller?.owner?.username,
            reserver: this.room.controller?.reservation?.username,
            level: this.room.controller?.level,
            blocked: this.room.controller?.upgradeBlocked,
            scanned: Game.time,
        }
        this.scanned = Game.time;
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
