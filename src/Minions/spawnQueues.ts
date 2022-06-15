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

    if (startTime && !spawn) {
        console.log('ERROR: Must specify a spawn if startTime is provided', office, data.name)
        return;
    }

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
            const sortedOrders = [
                ...orders.filter(o => o.startTime === Game.time),
                ...orders.filter(o => o.startTime === undefined)
            ];

            const nextScheduledOrders = new Map<StructureSpawn, SpawnOrder>();
            // Get next scheduled order per spawn
            for (const order of Memory.offices[office].spawnQueue) {
                if (order.priority >= priority && order.startTime && order.spawn?.spawn) {
                    const spawn = byId(order.spawn.spawn);
                    if (!spawn) continue;
                    if ((nextScheduledOrders.get(spawn)?.startTime ?? Infinity) < order.startTime) continue;
                    nextScheduledOrders.set(spawn, order); // This order is targeting this spawn specifically and is earlier
                }
            }

            // Handles scheduled orders first
            while (sortedOrders.length) {
                const order = sortedOrders.shift();
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
        }
    }
}
