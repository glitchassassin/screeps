import { BlockPlan } from "./BlockPlan";

export abstract class BlockPlanBuilder {
    public blockPlan = new BlockPlan();

    constructor(cached?: string) {
        if (cached !== undefined) {
            this.blockPlan.deserialize(cached);
            this.deserialize();
        }
    }

    abstract deserialize(): void
    abstract plan(...args: unknown[]): BlockPlanBuilder
}
