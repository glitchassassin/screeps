import { moveTo } from 'Behaviors/moveTo';
import { FEATURES } from 'config';
import { byId } from 'Selectors/byId';
import { adjacentWalkablePositions, posAtDirection } from 'Selectors/Map/MapCoordinates';
import { minionCost } from 'Selectors/minionCostPerTick';
import { getSpawns } from 'Selectors/roomPlans';
import { boostsAvailable } from 'Selectors/shouldHandleBoosts';
import { getEnergyStructures } from 'Selectors/spawnsAndExtensionsDemand';

interface SpawnOrderData {
  name: string;
  body: BodyPartConstant[];
  boosts?: MineralBoostConstant[];
  memory?: CreepMemory;
}
interface PreferredSpawnData {
  spawn?: Id<StructureSpawn>;
  directions?: DirectionConstant[];
}
interface SpawnOrder {
  startTime?: number;
  duration: number;
  priority: number;
  spawn?: PreferredSpawnData;
  data: SpawnOrderData;
}
declare global {
  interface OfficeMemory {
    spawnQueue: SpawnOrder[];
  }
}

function byPriorityThenSpawnTime(a: SpawnOrder, b: SpawnOrder) {
  if (a.priority !== b.priority) {
    return b.priority - a.priority;
  } else {
    return (a.startTime ?? Game.time) - (b.startTime ?? Game.time);
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
  };

  // console.log('Spawn scheduled', order.data.name, order.priority, order.startTime);

  Memory.offices[office].spawnQueue.push(order);
  Memory.offices[office].spawnQueue.sort(byPriorityThenSpawnTime);
}

function vacateSpawns(office: string) {
  for (const spawn of getSpawns(office)) {
    if (spawn.spawning && spawn.spawning.remainingTime < 2) {
      const spawningSquares =
        spawn.spawning.directions?.map(d => posAtDirection(spawn.pos, d)) ?? adjacentWalkablePositions(spawn.pos, true);
      for (const pos of spawningSquares) {
        for (const creep of pos.lookFor(LOOK_CREEPS)) {
          if (creep.name.startsWith('REFILL')) continue; // don't shove refillers
          moveTo(creep, { pos: spawn.pos, range: 2 }, { flee: true });
        }
      }
    }
  }
}

const orderAttempted = new WeakMap<SpawnOrder, number>();
export function spawnFromQueues() {
  for (const office in Memory.offices) {
    vacateSpawns(office);
    let availableSpawns = getSpawns(office).filter(s => !s.spawning || s.spawning.remainingTime === 1);

    // loop through priorities, highest to lowest
    for (const order of Memory.offices[office].spawnQueue) {
      // console.log('availableSpawns', availableSpawns, JSON.stringify(order));
      if (availableSpawns.length === 0) break; // No more available spawns
      // Get next scheduled order per spawn
      if (order.startTime && order.startTime > Game.time) {
        continue; // Not ready to spawn yet
      }
      if (order.spawn?.spawn && byId(order.spawn.spawn)?.spawning) {
        continue; // Specific spawn requested; wait until it's free
      }
      const spawn = availableSpawns.find(s => {
        if (byId(order.spawn?.spawn)) {
          // Spawn-specific order
          return s.id === order.spawn!.spawn;
        }
        return true;
      });
      if (!spawn) {
        // No more available spawns
        continue;
      }
      // Spawn is available
      // console.log(order.data.body, order.data.name);
      const result = spawn.spawnCreep(order.data.body, order.data.name, {
        directions: order.spawn?.directions,
        memory: {
          ...order.data.memory
        },
        energyStructures: getEnergyStructures(office)
      });
      // console.log('spawn result', result);
      if (result === OK) {
        availableSpawns = availableSpawns.filter(s => s !== spawn);
        orderBoosts(office, order);
        Memory.offices[office].spawnQueue = Memory.offices[office].spawnQueue.filter(o => o !== order);
      } else if (
        result === ERR_BUSY ||
        (result === ERR_NOT_ENOUGH_ENERGY && Game.rooms[office].energyCapacityAvailable >= minionCost(order.data.body))
      ) {
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

const orderBoosts = (office: string, order: SpawnOrder) => {
  for (const resource of order.data.boosts ?? []) {
    const part = Object.entries(BOOSTS).find(([k, v]) => resource in v)?.[0] as BodyPartConstant | undefined;
    if (!part) continue;
    let available = FEATURES.LABS && boostsAvailable(office, resource, false);
    const workParts = order.data.body.filter(p => p === part).length;
    const target = workParts * LAB_BOOST_MINERAL;
    if (available && available >= target) {
      // We have enough minerals, enter a boost order
      Memory.offices[office].lab.boosts.push({
        boosts: [
          {
            type: resource,
            count: target
          }
        ],
        name: order.data.name
      });
    }
  }
};
