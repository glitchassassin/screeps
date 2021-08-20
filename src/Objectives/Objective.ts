import { byId } from "Selectors/byId";
import { isCreep } from "Selectors/typeguards";

export const Objectives: Record<string, Objective> = {}

declare global {
    interface CreepMemory {
        objective?: string;
    }
}

export abstract class Objective {
    public id: string;
    /**
     * Search indexer for `assigned` creeps: default implementation
     */
    protected _indexer(c: Creep){
        return c.memory.office
    }
    public assigned: Id<Creep>[] = [];
    constructor(public priority: number = 5) {
        this.id = this.constructor.name;
    }

    /**
     * The BehaviorTree for all creeps (regardless of office)
     */
    abstract action(creep: Creep): void;

    /**
     * Checks to see if this Objective needs more minions in the
     * given office. If so, attempt to spawn them using one or
     * more of the provided list of spawns.
     */
    abstract spawn(): void;

    /**
     * Returns estimated energy/tick to run this objective (positive if net income, negative if net loss)
     */
    abstract energyValue(officeName: string): number;

    private _minions = new Map<string, Id<Creep>[]>();
    private _lastMinionCount = 0;
    public minions(index: string) {
        // Re-index assigned minions when the count changes
        if (this.assigned.length !== this._lastMinionCount) {
            this._lastMinionCount = this.assigned.length;
            this._minions = new Map<string, Id<Creep>[]>();
            for (let creep of this.assigned.map(byId)) {
                if (creep) {
                    let i = this._indexer(creep);
                    this._minions.set(i, (this._minions.get(i) ?? []).concat(creep.id));
                }
            }
        }

        return (this._minions.get(index) ?? []).map(byId).filter(isCreep)
    }
}
