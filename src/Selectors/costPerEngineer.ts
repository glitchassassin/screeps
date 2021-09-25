import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { memoize } from "utils/memoizeFunction";
import { minionCostPerTick } from "./minionCostPerTick";

export const costPerEngineer = memoize(
    (energy: number, efficiency: number) => `${energy} ${efficiency}`,
    (energy: number, efficiency: number) => {
        const engineer = MinionBuilders[MinionTypes.ENGINEER](energy);
        const workPartsPerEngineer = engineer.filter(p => p === WORK).length;
        const minionCost = minionCostPerTick(engineer);
        // console.log('efficiency', efficiency)

        return minionCost + (workPartsPerEngineer * efficiency);
    }
)
