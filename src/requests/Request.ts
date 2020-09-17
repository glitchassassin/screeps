export class Request {
    completed = false;
    assignedTo: string[] = [];
    created = Game.time;
    constructor(
        public sourceId: string|null = null,
        public priority = 5,
    ) { }

    public canAssign() {
        // By default, can only assign one fulfiller
        return this.assignedTo.length === 0;
    }
}
