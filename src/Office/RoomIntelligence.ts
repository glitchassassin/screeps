import { DefenseAnalyst, TerritoryIntent } from "Boardroom/BoardroomManagers/DefenseAnalyst";

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
        let defenseAnalyst = global.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        return defenseAnalyst.getTerritoryIntent(this);
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
        this.hostileStructures = (
            this.room.find(FIND_HOSTILE_SPAWNS).length +
            this.room.find(FIND_HOSTILE_STRUCTURES).filter(s => s.structureType === STRUCTURE_INVADER_CORE).length
        );
        this.hostileMinions = this.room.find(FIND_HOSTILE_CREEPS).length;
        if (this.hostileMinions > 0) {
            for (let e of this.room.getEventLog()) {
                if (e.event === EVENT_ATTACK && e.data.attackType !== EVENT_ATTACK_TYPE_NUKE) {
                    let actor = Game.getObjectById(e.objectId as Id<Creep|StructureTower>)
                    if (actor && !actor.my) {
                        // Hostiles attacking
                        this.lastHostileActivity = Game.time;
                        break;
                    }
                } else if (e.event === EVENT_ATTACK_CONTROLLER) {
                    let actor = Game.getObjectById(e.objectId as Id<Creep>)
                    if (actor && !actor.my) {
                        this.lastHostileActivity = Game.time;
                        break;
                    }
                }
            }
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
