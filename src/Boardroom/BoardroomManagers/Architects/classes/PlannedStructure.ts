import { CachedStructure, Structures } from "WorldState/Structures";

import { BehaviorResult } from "BehaviorTree/Behavior";
import { BuildRequest } from "BehaviorTree/requests/Build";

export class PlannedStructure<T extends BuildableStructureConstant = BuildableStructureConstant> {
    constructor(
        public pos: RoomPosition,
        public structureType: T
    ) {}
    structure?: CachedStructure<Structure<T>>;
    buildRequest?: BuildRequest;

    survey() {
        if (this.structure) return true; // Structure exists
        if ((this.buildRequest && !this.buildRequest.result) || !Game.rooms[this.pos.roomName]) {
            // Structure is being built, or we cannot see the room
            return false;
        }
        // Look for structure at position
        this.structure = Structures.byPos(this.pos).find(s => s.structureType === this.structureType) as CachedStructure<Structure<T>>;

        if (this.structure) return true; // Structure exists
        return false; // Structure does not exist
    }
    generateBuildRequest() {
        if (!this.buildRequest || (!this.structure && this.buildRequest.result === BehaviorResult.FAILURE)) {
            this.buildRequest = new BuildRequest(this.pos, this.structureType);
        }
        return this.buildRequest;
    }
    visualize() {
        let vis = new RoomVisual(this.pos.roomName);
        if (!this.structure) {
            vis.structure(this.pos.x, this.pos.y, this.structureType);
        }
    }
}
