import { Objectives } from "OldObjectives/Objective";
import { byId } from "Selectors/byId";
import { minionCost } from "Selectors/minionCostPerTick";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

const targets = new Map<Id<Creep>, Id<StructureSpawn>>();
export function renewAtSpawn(creep: Creep) {
    if (creep.ticksToLive ?? 0 > 1300) return BehaviorResult.SUCCESS;

    const spawn = byId(targets.get(creep.id)) ?? creep.pos.findClosestByRange(FIND_MY_SPAWNS);
    if (!spawn) return BehaviorResult.FAILURE;
    targets.set(creep.id, spawn.id);
    if (moveTo(spawn.pos)(creep) === BehaviorResult.SUCCESS) {
        if (spawn.renewCreep(creep) === OK && creep.memory.objective) {
            // Record energy used for renewing on the creep's parent objective
            const cost = Math.ceil(minionCost(creep.body.map(p => p.type))/2.5/creep.body.length);
            console.log('Renewing', creep.name, cost)
            Objectives[creep.memory.objective].recordEnergyUsed(creep.memory.office, cost);
        }
    }
    return BehaviorResult.INPROGRESS;
}
