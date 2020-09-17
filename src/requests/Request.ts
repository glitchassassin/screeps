export class Request {
    completed = false;
    created = Game.time;
    constructor(
        public sourceId: string|null = null,
        public priority = 5,
    ) { }
}
