import { CachedStructure, Structures } from "WorldState/Structures";

import { BehaviorResult } from "BehaviorTree/Behavior";
import { BuildRequest } from "BehaviorTree/requests/Build";
import { RepairRequest } from "BehaviorTree/requests/Repair";
import { byId } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

export class PlannedStructure<T extends BuildableStructureConstant = BuildableStructureConstant> {
    constructor(
        public pos: RoomPosition,
        public structureType: T
    ) {}
    _structure?: CachedStructure<Structure<T>>;
    buildRequest?: BuildRequest;
    repairRequest?: RepairRequest;

    get structure() {
        if (Game.rooms[this.pos.roomName] && byId(this._structure?.id)) {
            return this._structure;
        }

        this._structure ??= Structures.byPos(this.pos).find(s => s.structureType === this.structureType) as CachedStructure<Structure<T>>;
        return this._structure;
    }

    survey() {
        if (this.structure) return true; // Cached structure exists

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
    generateRepairRequest(targetHealth?: number) {
        if (this.structure && (
            !this.repairRequest || (
                this.repairRequest?.result === BehaviorResult.FAILURE ||
                this.repairRequest?.result === BehaviorResult.SUCCESS
            )
        )) {
            this.repairRequest = new RepairRequest(this.structure, targetHealth);
        }
        return this.repairRequest;
    }
    visualize() {
        let vis = new RoomVisual(this.pos.roomName);
        if (!this.structure) {
            vis.structure(this.pos.x, this.pos.y, this.structureType);
        }
    }
}

profiler.registerClass(PlannedStructure, 'PlannedStructure')
