import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { minionCostPerTick } from "./minionCostPerTick";

export const costPerEngineerConstruction = (energy: number, efficiency: number) => {
    const engineer = MinionBuilders[MinionTypes.ENGINEER](energy);
    const workPartsPerEngineer = engineer.filter(p => p === WORK).length;
    const minionCost = minionCostPerTick(engineer);
    // console.log('efficiency', efficiency)

    return minionCost + (workPartsPerEngineer * efficiency);
}


export const costPerEngineer = (energy: number, repairCost: number) => {
    const engineer = MinionBuilders[MinionTypes.ENGINEER](energy);
    const minionCost = minionCostPerTick(engineer);
    return minionCost + repairCost;
}
