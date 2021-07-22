import { BehaviorResult, Blackboard, Selector, Sequence } from "BehaviorTree/Behavior";

import { Capacity } from "WorldState/Capacity";
import { LogisticsRouteData } from "WorldState/LogisticsRoutes";
import { continueIndefinitely } from "./continueIndefinitely";
import { depositResources } from "./depositResources";
import { log } from "utils/logger";
import { moveTo } from "./moveTo";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        lastFillTarget?: RoomPosition
    }
}

export const depositAtNextFillTarget = (roomName: string, route: "extensionsAndSpawns"|"towers") => (creep: Creep, bb: Blackboard) => {
    let targets = LogisticsRouteData.byRoom(roomName)?.office?.[route].destinations ?? [];

    for (let target of targets) {
        if (!target.structure || !Capacity.byId(target.structureId as Id<AnyStoreStructure>, RESOURCE_ENERGY)?.free) continue;
        log(creep.name, `depositAtNextFillTarget: Found ${target.structureType} at ${target.pos}`)

        return Selector(
            Sequence(
                depositResources(target.structure as AnyStoreStructure, RESOURCE_ENERGY),
                continueIndefinitely(),
            ),
            moveTo(target.pos),
        )(creep, bb);
    }
    log(creep.name, 'depositAtNextFillTarget: No fill targets remaining')
    return BehaviorResult.SUCCESS;
}

