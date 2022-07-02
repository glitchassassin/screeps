import { Budget } from "Budgets";
import { byId } from "Selectors/byId";
import { isCreep } from "Selectors/typeguards";

export const Objectives: Record<string, Objective> = {}

declare global {
    interface CreepMemory {
        objective?: string;
    }
}

export interface ObjectiveMetrics {
    energyBudget?: number;
    spawnQuota: number;
    minions: number;
}

export abstract class Objective {
    public initialized = Game.time;
    public energyUsed = new Map<string, number>();
    public recordEnergyUsed(office: string, amount: number) {
        if (amount < 0) throw new Error('Invalid energy used amount')
        this.energyUsed.set(office, (this.energyUsed.get(office) ?? 0) + amount);
    }
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

    public metrics = new Map<string, ObjectiveMetrics>()

    /**
     * Runs only while the creep is still spawning
     */
    public preSpawnAction(creep: Creep) {
        // Default implementation does nothing
    }

    public boostQuotas(office: string): { boost: MineralBoostConstant, amount: number }[] {
        return [];
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
     * Executes logic for the structures (towers, labs, etc)
     */
    public structures() {
        // Does nothing by default
    }

    /**
     * Returns estimated energy/cpu/spawn for a given energy budget
     */
    abstract budget(office: string, energy: number): Budget
    public hasFixedBudget(office: string) {
        return false;
    }

    public active(office: string) {
        return (this.budget(office, 1000).energy !== 0);
    }

    public budgetIsCapped(office: string) {
        return !(this.budget(office, 1000).energy < this.budget(office, 2000).energy);
    }

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
