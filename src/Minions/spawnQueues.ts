import { FEATURES } from 'config';
import { Mission, MissionType } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { adjacentWalkablePositions, posAtDirection } from 'Selectors/Map/MapCoordinates';
import { getSpawns } from 'Selectors/roomPlans';
import { boostsAvailable } from 'Selectors/shouldHandleBoosts';
import { getEnergyStructures } from 'Selectors/spawnsAndExtensionsDemand';

interface SpawnOrderData {
  name: string;
  body: BodyPartConstant[];
  boosts?: MineralBoostConstant[];
  memory?: Partial<CreepMemory>;
}
interface PreferredSpawnData {
  spawn?: Id<StructureSpawn>;
  directions?: DirectionConstant[];
}
export interface SpawnOrder {
  mission: Mission<MissionType>;
  duration: number;
  spawn?: PreferredSpawnData;
  data: SpawnOrderData;
}

export function createSpawnOrder(
  mission: Mission<MissionType>,
  data: SpawnOrderData,
  spawn?: PreferredSpawnData
): SpawnOrder {
  const duration = data.body.length * CREEP_SPAWN_TIME;

  return {
    duration,
    mission,
    data,
    spawn
  };
}

export function vacateSpawns() {
  for (const office in Memory.offices) {
    for (const spawn of getSpawns(office)) {
      if (spawn.spawning && spawn.spawning.remainingTime < 2) {
        const spawningSquares =
          spawn.spawning.directions?.map(d => posAtDirection(spawn.pos, d)) ??
          adjacentWalkablePositions(spawn.pos, true);
        for (const pos of spawningSquares) {
          for (const creep of pos.lookFor(LOOK_CREEPS)) {
            if (creep.name.startsWith('REFILL')) continue; // don't shove refillers
            moveTo(creep, { pos: spawn.pos, range: 2 }, { flee: true });
          }
        }
      }
    }
  }
}

export function spawnOrder(office: string, order: SpawnOrder) {
  let availableSpawns = getSpawns(office).filter(s => !s.spawning || s.spawning.remainingTime === 1);

  // console.log('availableSpawns', availableSpawns, JSON.stringify(order));
  if (availableSpawns.length === 0) return false; // No more available spawns
  // Get next scheduled order per spawn
  const spawn = availableSpawns.find(s => {
    if (byId(order.spawn?.spawn)) {
      // Spawn-specific order
      return s.id === order.spawn!.spawn;
    }
    return true;
  });
  if (!spawn) {
    // No more available spawns
    return false;
  }
  // Spawn is available
  // console.log(order.data.body, order.data.name);
  const result = spawn.spawnCreep(order.data.body, order.data.name, {
    directions: order.spawn?.directions,
    memory: {
      ...order.data.memory,
      mission: {
        ...order.mission,
        creep: order.data.name
      }
    },
    energyStructures: getEnergyStructures(office)
  });
  // console.log('spawn result', result);
  if (result === OK) {
    availableSpawns = availableSpawns.filter(s => s !== spawn);
    orderBoosts(office, order);
    return true;
  } else if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_BUSY) {
    return true; // spawn attempt will be successful
  } else {
    // Spawn failed un-recoverably, abandon order
    console.log('Unrecoverable spawn error', result);
    console.log(order.data.name, order.data.body.length);
  }
  return false;
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
