import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";
import { States, setState } from "./states";

import { Capacity } from "WorldState/Capacity";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { Route } from "WorldState/LogisticsRouteModel";
import { log } from "utils/logger";

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        logisticsRoute?: Route
        logisticsRouteResource?: ResourceConstant
        logisticsRouteIndex?: number
    }
}



export const setLogisticsRoute = (route: Route, resource?: ResourceConstant) => (creep: Creep, bb: Blackboard) => {
    bb.logisticsRoute = route;
    bb.logisticsRouteResource = resource;
    return BehaviorResult.SUCCESS;
}
export const resetLogisticsRoute = () => (creep: Creep, bb: Blackboard) => {
    log(creep.name, 'Resetting logistics route');
    bb.logisticsRouteIndex = 0;
    return BehaviorResult.SUCCESS;
}
export const checkIfLogisticsRouteIsDone = () => (creep: Creep, bb: Blackboard) => {
    if (!bb.logisticsRoute) return BehaviorResult.FAILURE;

    let throughput = LogisticsAnalyst.calculateRouteThroughput(bb.logisticsRoute);
    log(creep.name, `checkIfLogisticsRouteIsDone: throughput ${throughput}`)
    if (throughput === 0) {
        return setState(States.DONE)(creep, bb);
    }
    return BehaviorResult.FAILURE;
}

/**
 * Returns FAILURE if no next step can be determined
 * Returns SUCCESS if pointer has been updated to a valid next step
 */
export const getNextLogisticsRouteStep = () => (creep: Creep, bb: Blackboard) => {
    if (!bb.logisticsRoute) return BehaviorResult.FAILURE;
    bb.logisticsRouteIndex ??= 0;
    let sourcesLength = bb.logisticsRoute.sources.length
    let routeLength = sourcesLength + bb.logisticsRoute.destinations.length

    log(creep.name, `getNextLogisticsRouteStep (creep ${creep.store.getFreeCapacity()} free, ${creep.store.getUsedCapacity(bb.logisticsRouteResource)} used)`)

    let failsafe = routeLength;
    while (failsafe >= 0) {
        failsafe -= 1;

        log(creep.name, `Checking logistics route index ${bb.logisticsRouteIndex}`)
        // Check if we should skip the next step
        if (bb.logisticsRouteIndex < sourcesLength) { // Step is a source
            let source = bb.logisticsRoute.sources[bb.logisticsRouteIndex];
            let sourceCapacity = LogisticsAnalyst.countEnergyInContainersOrGround(source.pos)
            log(creep.name, `Evaluating source at index ${bb.logisticsRouteIndex} (capacity ${sourceCapacity})`)
            if (creep.store.getFreeCapacity() > 0 && sourceCapacity > 0) {
                log(creep.name, `Next step: withdraw from source at ${bb.logisticsRouteIndex}`)
                break; // Creep needs more, this source has more
            }
        } else { // Step is a destination
            let d = bb.logisticsRoute.destinations[bb.logisticsRouteIndex - sourcesLength];
            log(creep.name, `Evaluating destination ${d.structureType} (capacity ${Capacity.byId(d.structure?.id as Id<AnyStoreStructure>)?.free} or ${CONTAINER_CAPACITY - LogisticsAnalyst.countEnergyInContainersOrGround(d.pos)})`)
            if (creep.store.getUsedCapacity(bb.logisticsRouteResource) > 0) {
                if (d.structure && Capacity.byId(d.structure.id as Id<AnyStoreStructure>)?.free !== 0) {
                    log(creep.name, `Next step: transfer to destination at ${bb.logisticsRouteIndex}`)
                    break; // Creep has more, destination needs more
                } else if (
                    !d.structure &&
                    d.structureType === STRUCTURE_STORAGE &&
                    LogisticsAnalyst.countEnergyInContainersOrGround(d.pos) < CONTAINER_CAPACITY
                ) {
                    log(creep.name, `Next step: drop at destination at ${bb.logisticsRouteIndex}`)
                    break; // Creep has more, destination resource pile needs more
                }
            }
        }

        // Go to the next step
        bb.logisticsRouteIndex = ((bb.logisticsRouteIndex ?? 0) + 1) % routeLength;
    }
    if (failsafe < 0) {
        // Base case, if there's nothing to be done
        log(creep.name, `Failing, nothing to be done`)
        return BehaviorResult.FAILURE;
    }

    // Transition state if needed
    if (bb.logisticsRouteIndex >= sourcesLength) {
        return setState(States.DEPOSIT)(creep, bb);
    } else {
        return setState(States.WITHDRAW)(creep, bb);
    }
}
