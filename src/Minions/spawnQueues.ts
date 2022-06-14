import { BehaviorResult } from "Behaviors/Behavior";
import { byId } from "Selectors/byId";
import { getSpawns } from "Selectors/roomPlans";
import { getEnergyStructures } from "Selectors/spawnsAndExtensionsDemand";

interface SpawnOrderData {
    name: string,
    body: BodyPartConstant[],
    directions?: DirectionConstant[],
    memory?: CreepMemory
}
interface SpawnOrder {
    startTime: number,
    duration: number,
    priority: number,
    data: SpawnOrderData
}
declare global {
    interface OfficeMemory {
        spawnQueues: {
            [id: string]: SpawnOrder[]
        }
    }
}

/**
 * Finds the closest slot to startTime that will fit spawnTime. Returns the startTime, or undefined
 * if no match was found.
 *
 * If priority is provided, will ignore all slots of lower priority. Does not actually remove these
 * from the queue.
 */
function findSpaceInQueue(queue: SpawnOrder[], startTime: number, spawnTime: number, priority: number = 0) {
    // Last allowed slot to queue
    const lastStartTime = Game.time + CREEP_LIFE_TIME + 1;
    if (startTime > lastStartTime) return undefined;

    // Previous open spot in the queue
    let previousDoneTime = Game.time;
    for (const order of queue.filter(o => o.priority >= priority)) {
        const doneTime = order.startTime + order.duration;
        if (doneTime <= startTime) {
            // This order is before our target start time, make a note and keep going
            previousDoneTime = doneTime;
            continue;
        } else {
            if (order.startTime - startTime > spawnTime) {
                // We have space between two orders at the requested startTime
                return startTime;
            } else if (order.startTime - previousDoneTime > spawnTime) {
                // We have space between two orders, if we push the requested startTime back
                return order.startTime - spawnTime - 1;
            } else {
                // We do not have room between these two orders
                previousDoneTime = doneTime;
                continue;
            }
        }
    }
    // We are at the end of the queue

    // Last queued spawn ends before startTime, so we can start there
    if (previousDoneTime < startTime) return startTime;
    // Last queued job ends after startTime, so we can queue up immediately after
    if (previousDoneTime + 1 < lastStartTime) return previousDoneTime + 1;
    // No slots found
    return undefined;
}

export function scheduleSpawn(
    office: string,
    name: string,
    body: BodyPartConstant[],
    priority: number,
    boosts?: MineralBoostConstant[],
    directions?: DirectionConstant[],
    memory?: CreepMemory,
    spawn?: Id<StructureSpawn>,
    startTime?: number
) {
    const spawnIds = spawn ? [spawn] : getSpawns(office).map(s => s.id);
    Memory.offices[office].spawnQueues ??= {};
    spawnIds.forEach(id => Memory.offices[office].spawnQueues[id] ??= []);

    const spawnTime = body.length * CREEP_SPAWN_TIME;

    let bestStartTime: number|undefined = undefined;
    let queueId: string|undefined = undefined;
    for (const spawnId of spawnIds) {
        const queueStartTime = findSpaceInQueue(
            Memory.offices[office].spawnQueues[spawnId],
            startTime ?? Game.time,
            spawnTime,
            priority
        )
        if (!queueStartTime) continue;
        if (!startTime || queueStartTime === startTime) {
            queueId = spawnId;
            bestStartTime = queueStartTime;
            break;
        }
        if (!bestStartTime || Math.abs(queueStartTime - startTime) < Math.abs(bestStartTime - startTime)) {
            queueId = spawnId;
            bestStartTime = queueStartTime;
        }
    }
    if (!bestStartTime || !queueId) return BehaviorResult.FAILURE;

    // Remove any conflicting orders
    Memory.offices[office].spawnQueues[queueId] = Memory.offices[office].spawnQueues[queueId].filter(order => {
        order.startTime + order.duration < bestStartTime! || order.startTime < bestStartTime! + spawnTime
    })
    // Add this order
    Memory.offices[office].spawnQueues[queueId].push({
        startTime: bestStartTime,
        duration: spawnTime,
        name,
        body,
        priority,
        boosts,
        directions,
        memory
    });
    // Sort by start time
    Memory.offices[office].spawnQueues[queueId].sort((a, b) => a.startTime - b.startTime);
    return BehaviorResult.SUCCESS;
}

export function spawnFromQueues() {
    for (const office in Memory.offices) {
        for (const spawnId in Memory.offices[office].spawnQueues) {
            const spawn = byId(spawnId as Id<StructureSpawn>);
            if (!spawn) {
                delete Memory.offices[office].spawnQueues[spawnId];
                continue;
            }
            const order = Memory.offices[office].spawnQueues[spawnId][0];
            if (Game.time !== order.startTime) continue;
            const result = spawn.spawnCreep(order.body, order.name, {
                directions: order.directions,
                memory: order.memory,
                energyStructures: getEnergyStructures(office)
            });
            if (result === ERR_BUSY || result === ERR_NOT_ENOUGH_ENERGY) {
                console.log('SPAWN ERROR', result, office, spawnId, JSON.stringify(order));
                // Delay the order until next tick, or cancel if that would cause a conflict
                const nextOrderWithPriority = Memory.offices[office].spawnQueues[spawnId].slice(1).find(o => o.priority >= order.priority)
                if (!nextOrderWithPriority || order.startTime + order.duration < nextOrderWithPriority.startTime) {
                    order.startTime += 1;
                    console.log('Delaying spawn order');
                } else {
                    console.log('Canceling spawn order');
                    Memory.offices[office].spawnQueues[spawnId].shift();
                }
            } else {
                Memory.offices[office].spawnQueues[spawnId].shift(); // discard completed order
            }
        }
    }
}
