export class RoomIntelligence {
    constructor(
        public name: string
    ) {}


    public get room() : Room {
        return Game.rooms[this.name];
    }

}
