export const Objectives: Record<string, Objective> = {}

declare global {
    interface CreepMemory {
        objective?: string;
    }
}

export abstract class Objective {
    public id: string;
    constructor(public priority: number = 5) {
        this.id = this.constructor.name;
    }
    public assigned: Id<Creep>[] = [];

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
}
