import { byId } from "Selectors/byId";
import { getSpawns } from "Selectors/roomPlans";
import { getEnergyStructures } from "Selectors/spawnsAndExtensionsDemand";

interface SpawnOrderData {
    name: string,
    body: BodyPartConstant[],
    memory?: CreepMemory
}
interface PreferredSpawnData {
    spawn: Id<StructureSpawn>,
    directions?: DirectionConstant[],
}
interface SpawnOrder {
    startTime?: number,
    duration: number,
    priority: number,
    spawn?: PreferredSpawnData,
    data: SpawnOrderData
}
interface ScheduledSpawnOrder extends SpawnOrder {
    startTime: number,
}
declare global {
    interface OfficeMemory {
        spawnQueue: SpawnOrder[],
    }
}

export function scheduleSpawn(
    office: string,
    priority: number,
    data: SpawnOrderData,
    startTime?: number,
    spawn?: PreferredSpawnData
) {
    Memory.offices[office].spawnQueue ??= [];

    const duration = data.body.length * CREEP_SPAWN_TIME;

    const order: SpawnOrder = {
        startTime,
        duration,
        priority,
        data,
        spawn
    }

    Memory.offices[office].spawnQueue.push(order);
    Memory.offices[office].spawnQueue.sort((a, b) => a.priority - b.priority);
}

export function spawnFromQueues() {
    for (const office in Memory.offices) {
        let availableSpawns = getSpawns(office).filter(s => !s.spawning);

        const priorities = [...new Set(Memory.offices[office].spawnQueue.map(o => o.priority))].sort((a, b) => b - a);

        // loop through priorities, highest to lowest
        for (const priority of priorities) {
            if (availableSpawns.length === 0) break; // No more available spawns

            const orders = Memory.offices[office].spawnQueue.filter(o => o.priority === priority);
            const scheduledOrders = orders.filter(o => o.startTime === Game.time);
            const unscheduledOrders = orders.filter(o => o.startTime === undefined);

            const nextScheduledOrders = new Map<StructureSpawn, SpawnOrder>();
            // Set orders specific to each spawn
            for (const order of Memory.offices[office].spawnQueue) {
                if (order.priority >= priority && order.startTime && order.spawn?.spawn) {
                    const spawn = byId(order.spawn.spawn);
                    if (!spawn) continue;
                    if ((nextScheduledOrders.get(spawn)?.startTime ?? Infinity) < order.startTime) continue;
                    nextScheduledOrders.set(spawn, order); // This order is targeting this spawn specifically and is earlier
                }
            }

            // Handle scheduled orders first
            while (scheduledOrders.length) {
                const order = scheduledOrders.shift();
                if (!order) break;
                const spawn = availableSpawns.find(s => {
                    if (order.spawn?.spawn) {
                        // Spawn-specific order
                        return (s.id === order.spawn.spawn);
                    } else {
                        // Order should go to a spawn with room before the next spawn-specific order
                        return (nextScheduledOrders.get(s)?.startTime ?? Infinity) > order.startTime! + order.duration
                    }
                });
                if (order.spawn?.spawn && !spawn) {
                    // Requested Spawn was not available, postpone order
                    order.startTime = undefined;
                    continue;
                } else if (!spawn) {
                    // No more available spawns
                    break;
                }
                // Spawn is available
                const result = spawn.spawnCreep(order.data.body, order.data.name, {
                    directions: order.spawn?.directions,
                    memory: order.data.memory,
                    energyStructures: getEnergyStructures(office)
                });
                availableSpawns = availableSpawns.filter(s => s !== spawn);
                if (result !== OK) {
                    // Spawn failed, postpone order
                    order.startTime = undefined;
                }
            }

            // Now add other scheduled orders to nextScheduledOrders
            const otherScheduledOrdersInReverseOrder = Memory.offices[office].spawnQueue.filter(o => o.startTime && !o.spawn).sort((a, b) => (b.startTime! + b.duration) - (a.startTime! + a.duration))
            const allSpawns = getSpawns(office);
            for (const order of otherScheduledOrdersInReverseOrder) {
                let bestSpawn: StructureSpawn|undefined = undefined;
                let bestScore = Infinity;
                for (const spawn of allSpawns) {
                    const score = (nextScheduledOrders.get(spawn)?.startTime ?? Infinity) - (order.startTime! + order.duration);
                    if (score > 0 && score < bestScore) {
                        bestScore = score;
                        bestSpawn = spawn;
                    }
                }
                if (bestSpawn) {
                    nextScheduledOrders.set(bestSpawn, order);
                }
            }

            // Calculate time to next scheduled order,
            const nextScheduledOrder = orders.filter(o => o.priority >= priority && o.startTime).sort((a, b) => a.startTime! - b.startTime!).slice(0, availableSpawns.length).pop();

        }
        // orders scheduled to begin spawning this tick
        const scheduledOrders = Memory.offices[office].spawnQueues.scheduled.filter(o => o.startTime === Game.time);

        for (const order of scheduledOrders) {
            if (availableSpawns.length === 0 || order.priority !== priorities[0]) {
                // Not the highest priority - Bump this order to the unscheduled spawn queue
                Memory.offices[office].spawnQueues.scheduled.filter(o => o !== order);
                Memory.offices[office].spawnQueues.unscheduled.push(order);
            }
        }

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
