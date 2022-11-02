import { FEATURES } from 'config';
import { missionById } from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { adjacentWalkablePositions, posAtDirection } from 'Selectors/Map/MapCoordinates';
import { getSpawns } from 'Selectors/roomPlans';
import { boostsAvailable } from 'Selectors/shouldHandleBoosts';
import { getEnergyStructures } from 'Selectors/spawnsAndExtensionsDemand';
import { MinionTypes } from './minionTypes';

export interface SpawnOrder {
  priority: number;
  office: string;
  budget: Budget;
  name: string;
  body: BodyPartConstant[];
  estimate: {
    cpu: number;
    energy: number;
  };
  memory: {
    role: MinionTypes;
    missionId: string;
  } & Partial<CreepMemory>;
  boosts?: MineralBoostConstant[];
  spawn?: Id<StructureSpawn>;
  directions?: DirectionConstant[];
}

declare global {
  interface CreepMemory {
    role: MinionTypes;
  }
}

export function vacateSpawns() {
  for (const office in Memory.offices) {
    for (const spawn of getSpawns(office)) {
      if (spawn.spawning) {
        // register spawning creeps
        const creep = spawn.spawning.name;
        const mission = missionById(Memory.creeps[creep].missionId.split('|')[0]);
        mission?.register(Game.creeps[creep]);

        if (spawn.spawning.remainingTime < 2) {
          const spawningSquares =
            spawn.spawning.directions?.map(d => posAtDirection(spawn.pos, d)) ??
            adjacentWalkablePositions(spawn.pos, true);
          for (const pos of spawningSquares) {
            for (const creep of pos.lookFor(LOOK_CREEPS)) {
              if (creep.name.startsWith('FM_')) continue; // don't shove refillers
              moveTo(creep, { pos: spawn.pos, range: 2 }, { flee: true });
            }
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
    if (byId(order.spawn)) {
      // Spawn-specific order
      return s.id === order.spawn;
    }
    return true;
  });
  if (!spawn) {
    // No more available spawns
    return false;
  }
  // Spawn is available
  // console.log(order.data.body, order.data.name);
  const result = spawn.spawnCreep(order.body, order.name, {
    directions: order.directions,
    memory: order.memory,
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
    console.log(order.name, order.body.length);
  }
  return false;
}

const orderBoosts = (office: string, order: SpawnOrder) => {
  for (const resource of order.boosts ?? []) {
    const part = Object.entries(BOOSTS).find(([k, v]) => resource in v)?.[0] as BodyPartConstant | undefined;
    if (!part) continue;
    let available = FEATURES.LABS && boostsAvailable(office, resource, false);
    const workParts = order.body.filter(p => p === part).length;
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
        name: order.name
      });
    }
  }
};
