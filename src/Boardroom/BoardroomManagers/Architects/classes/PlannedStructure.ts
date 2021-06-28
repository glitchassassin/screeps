import { CachedStructure, Structures } from "WorldState/Structures";

import { BehaviorResult } from "BehaviorTree/Behavior";
import { BuildRequest } from "BehaviorTree/requests/Build";
import profiler from "screeps-profiler";

export class PlannedStructure<T extends BuildableStructureConstant = BuildableStructureConstant> {
    constructor(
        public pos: RoomPosition,
        public structureType: T
    ) {}
    structure?: CachedStructure<Structure<T>>;
    buildRequest?: BuildRequest;

    survey() {
        if (this.structure) return true; // Structure exists
        if (!Game.rooms[this.pos.roomName]) {
            // We cannot see the room
            return false;
        }

        // Look for structure at position
        this.structure = Structures.byPos(this.pos).find(s => s.structureType === this.structureType) as CachedStructure<Structure<T>>;
        if (this.structure) {
            // Structure exists
            return true;
        }

        if (this.buildRequest && !this.buildRequest.result) {
            // Structure is being built
            return false;
        }
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

profiler.registerClass(PlannedStructure, 'PlannedStructure')
