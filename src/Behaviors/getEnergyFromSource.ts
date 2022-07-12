import { byId } from "Selectors/byId";
import { franchiseIsFull } from "Selectors/franchiseIsFull";
import { posById } from "Selectors/posById";
import { sourceIds } from "Selectors/roomCache";
import profiler from "utils/profiler";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

declare global {
    interface CreepMemory {
        franchiseTarget?: Id<Source>
    }
}

/**
 * harvest energy from the closest source
 */
export const getEnergyFromSource = profiler.registerFN((creep: Creep, office: string, roomName?: string) => {
    const franchiseTarget = byId(creep.memory.franchiseTarget);
    if (
        franchiseTarget?.energy === 0 ||
        (creep.memory.franchiseTarget && franchiseIsFull(office, creep.memory.franchiseTarget) && !franchiseTarget?.pos.inRangeTo(creep.pos, 1))
    ) {
        delete creep.memory.franchiseTarget;
        return BehaviorResult.FAILURE;
    }



    if (!creep.memory.franchiseTarget) {
        // Look for an available target (with energy, if visible)
        const targetRoom = roomName ?? office;
        const [source1, source2] = sourceIds(targetRoom)
            .map(id => ({pos: posById(id), id, source: byId(id)}))
            .filter(s => !s.source || (s.source.energy > 0 && !franchiseIsFull(office, s.id)))

        if (!source1) return BehaviorResult.FAILURE // No known sources in room

        creep.memory.franchiseTarget = (
            !source2 ||
            (source1.pos?.getRangeTo(creep.pos) ?? 0) < (source2.pos?.getRangeTo(creep.pos) ?? 0)
        ) ? source1.id : source2.id
    }

    if (!creep.memory.franchiseTarget) {
        return BehaviorResult.FAILURE;
    }
    const source = byId(creep.memory.franchiseTarget);
    const sourcePos = source?.pos ?? posById(creep.memory.franchiseTarget);

    if (sourcePos && moveTo(creep, { pos: sourcePos, range: 1 }) === BehaviorResult.SUCCESS) {
        if (creep.harvest(source!) === OK) {
            return BehaviorResult.INPROGRESS;
        } else {
            delete creep.memory.franchiseTarget;
            return BehaviorResult.FAILURE
        }
    }

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        delete creep.memory.franchiseTarget;
        return BehaviorResult.SUCCESS;
    } else {
        return BehaviorResult.INPROGRESS;
    }
}, 'getEnergyFromSource')
