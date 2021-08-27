import { byId } from "Selectors/byId";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

const targets = new Map<Id<Creep>, Id<StructureSpawn>>();
export function renewAtSpawn(creep: Creep) {
    if (creep.ticksToLive ?? 0 > 1300) return BehaviorResult.SUCCESS;

    const spawn = byId(targets.get(creep.id)) ?? creep.pos.findClosestByRange(FIND_MY_SPAWNS);
    if (!spawn) return BehaviorResult.FAILURE;
    targets.set(creep.id, spawn.id);
    if (moveTo(spawn.pos)(creep) === BehaviorResult.SUCCESS) {
        spawn.renewCreep(creep);
    }
    return BehaviorResult.INPROGRESS;
}
