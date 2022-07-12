import { moveTo } from "Behaviors/moveTo";
import { FEATURES } from "config";
import { byId } from "Selectors/byId";
import { calculateAdjacentPositions } from "Selectors/MapCoordinates";
import { getSpawns } from "Selectors/roomPlans";
import { boostsAvailable } from "Selectors/shouldHandleBoosts";
import { getEnergyStructures } from "Selectors/spawnsAndExtensionsDemand";

interface SpawnOrderData {
    name: string,
    body: BodyPartConstant[],
    boosts?: MineralBoostConstant[],
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

    // console.log('Spawn scheduled', order.data.name, order.priority, order.startTime);

    Memory.offices[office].spawnQueue.push(order);
    Memory.offices[office].spawnQueue.sort((a, b) => a.priority - b.priority);
}

function vacateSpawns(office: string) {
    for (const spawn of getSpawns(office)) {
        if (spawn.spawning && spawn.spawning.remainingTime < 2) {
            const spawningSquares = calculateAdjacentPositions(spawn.pos)
                .filter(pos =>
                    !spawn.spawning?.directions ||
                    spawn.spawning.directions.includes(spawn.pos.getDirectionTo(pos))
                );
            if (spawningSquares.every(pos => pos.lookFor(LOOK_CREEPS).length)) {
                for (const pos of spawningSquares) {
                    for (const creep of pos.lookFor(LOOK_CREEPS)) {
                        console.log('Telling', creep, 'to move');
                        moveTo(creep, { pos: spawn.pos, range: 2 }, { flee: true });
                    }
                }
            }
        }
    }
}

const orderAttempted = new WeakMap<SpawnOrder, number>();
export function spawnFromQueues() {
    for (const office in Memory.offices) {
        vacateSpawns(office);
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
                if (order.startTime && order.startTime <= Game.time) {
                    delete order.startTime;
                    continue;
                }
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
                // console.log('spawn order', JSON.stringify(order));
                if (!order) break;
                const spawn = availableSpawns.find(s => {
                    if (order.spawn?.spawn) {
                        // Spawn-specific order
                        return (s.id === order.spawn.spawn);
                    } else {
                        // Order should go to a spawn with room before the next spawn-specific order
                        return (nextScheduledOrders.get(s)?.startTime ?? Infinity) > (order.startTime ?? Game.time) + order.duration
                    }
                });
                // console.log('spawn', spawn)
                if (order.spawn?.spawn && !spawn) {
                    // Requested Spawn was not available, postpone order
                    order.startTime = undefined;
                    continue;
                } else if (!spawn) {
                    // No more available spawns
                    break;
                }
                // Spawn is available
                // console.log(order.data.body, order.data.name);
                const result = spawn.spawnCreep(order.data.body, order.data.name, {
                    directions: order.spawn?.directions,
                    memory: {
                        ...order.data.memory,
                    },
                    energyStructures: getEnergyStructures(office)
                });
                // console.log('spawn result', result)
                if (result === OK) {
                    availableSpawns = availableSpawns.filter(s => s !== spawn);
                    orderBoosts(office, order);
                    Memory.offices[office].spawnQueue = Memory.offices[office].spawnQueue.filter(o => o !== order);
                } else if (result === ERR_BUSY || result === ERR_NOT_ENOUGH_ENERGY) {
                    // Spawn failed, postpone order
                    order.startTime = undefined;
                    const firstTry = orderAttempted.get(order) ?? Game.time;
                    if (firstTry < Game.time - 151) {
                        // Give up after 151 ticks
                        console.log('Unable to resolve spawn error', result);
                        Memory.offices[office].spawnQueue = Memory.offices[office].spawnQueue.filter(o => o !== order);
                    }
                    orderAttempted.set(order, firstTry);
                } else {
                    // Spawn failed un-recoverably, abandon order
                    console.log('Unrecoverable spawn error', result);
                    console.log(order.data.name, order.data.body.length);
                    Memory.offices[office].spawnQueue = Memory.offices[office].spawnQueue.filter(o => o !== order);
                }
            }
        }
    }
}

const orderBoosts = (office: string, order: SpawnOrder) => {
    for (const resource of (order.data.boosts ?? [])) {
        const part = Object.entries(BOOSTS).find(([k, v]) => resource in v)?.[0] as BodyPartConstant | undefined;
        if (!part) continue;
        let available = FEATURES.LABS && boostsAvailable(office, resource, false);
        const workParts = order.data.body.filter(p => p === part).length
        const target = workParts * LAB_BOOST_MINERAL;
        if (available && available >= target) {
            // We have enough minerals, enter a boost order
            Memory.offices[office].lab.boosts.push({
                boosts: [{
                    type: resource,
                    count: target
                }],
                name: order.data.name
            });
        }
    }
}
