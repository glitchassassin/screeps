export class TerritoryIntelligence {
    constructor(
        public name: string
    ) {}


    public get room() : Room|undefined {
        return Game.rooms[this.name];
    }

}

export class RoomIntelligence extends TerritoryIntelligence {

    public get room() : Room {
        return Game.rooms[this.name];
    }

}
