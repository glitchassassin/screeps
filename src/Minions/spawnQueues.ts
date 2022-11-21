import { States } from 'Behaviors/states';
import { FEATURES } from 'config';
import { missionById } from 'Missions/BaseClasses/MissionImplementation';
import { Budget, getBudgetAdjustment } from 'Missions/Budgets';
import { move, moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { adjacentWalkablePositions, posAtDirection } from 'Selectors/Map/MapCoordinates';
import { getSpawns, roomPlans } from 'Selectors/roomPlans';
import { boostsAvailable } from 'Selectors/shouldHandleBoosts';
import { getEnergyStructures } from 'Selectors/spawnsAndExtensionsDemand';
import { BoostOrder } from 'Structures/Labs/LabOrder';
import { CreepBuild, MinionTypes } from './minionTypes';

export interface SpawnOrder {
  priority: number;
  office: string;
  budget: Budget;
  name: string;
  builds: CreepBuild[];
  estimate: (build: CreepBuild) => {
    cpu: number;
    energy: number;
  };
  memory: {
    role: MinionTypes;
    missionId: string;
  } & Partial<CreepMemory>;
  spawn?: Id<StructureSpawn>;
  directions?: DirectionConstant[];
}

declare global {
  interface CreepMemory {
    role: MinionTypes;
  }
}

export function registerCreeps() {
  for (const office in Memory.offices) {
    for (const spawn of getSpawns(office)) {
      if (spawn.spawning) {
        // register spawning creeps
        const creep = spawn.spawning.name;
        const mission = missionById(Memory.creeps[creep].missionId.split('|')[0]);
        mission?.register(Game.creeps[creep]);
      }
    }
  }
}

export function vacateSpawns() {
  for (const office in Memory.offices) {
    for (const spawn of getSpawns(office)) {
      if (spawn.spawning) {
        if (spawn.spawning.remainingTime < 2) {
          const spawningCreep = Game.creeps[spawn.spawning.name];
          const spawningSquares =
            spawn.spawning.directions?.map(d => posAtDirection(spawn.pos, d)) ??
            adjacentWalkablePositions(spawn.pos, true);
          move(spawningCreep, spawningSquares, 100);
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

export function spawnOrder(
  office: string,
  order: SpawnOrder,
  remaining: { energy: number; cpu: number }
): { build: CreepBuild; estimate: { cpu: number; energy: number }; spawned: boolean } | undefined {
  let availableSpawns = getSpawns(office).filter(s => !s.spawning || s.spawning.remainingTime === 1);

  // console.log('availableSpawns', availableSpawns, JSON.stringify(order));
  if (availableSpawns.length === 0) return undefined; // No more available spawns
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
    return undefined;
  }
  for (const build of order.builds) {
    const { body, boosts } = build;
    const adjustedBudget = getBudgetAdjustment(order.office, order.budget);
    const estimate = order.estimate(build);
    if (estimate.energy > remaining.energy - adjustedBudget || estimate.cpu > remaining.cpu) {
      // build doesn't fit our budget
      continue;
    }
    // check if boosts are available
    let boostOrder: BoostOrder | undefined;
    try {
      boostOrder = orderBoosts(office, order.name, boosts);
    } catch (e) {
      console.log(e);
      continue; // no distinction for not_enough_resources vs. energy
    }
    // Spawn is available
    // console.log(order.data.body, order.data.name);
    const result = spawn.spawnCreep(body, order.name, {
      directions: order.directions,
      memory: order.memory,
      energyStructures: getEnergyStructures(office)
    });
    // console.log(order.name, 'spawn result', result);
    if (result === OK) {
      availableSpawns = availableSpawns.filter(s => s !== spawn);
      if (boostOrder) {
        Memory.offices[office].lab.boosts.push(boostOrder);
        Memory.creeps[order.name].runState = States.GET_BOOSTED;
      }
    } else if (result !== ERR_NOT_ENOUGH_ENERGY && result !== ERR_BUSY) {
      // Spawn failed un-recoverably, abandon order
      console.log('Unrecoverable spawn error', result);
      console.log(order.name, body.length);
    }
    return {
      build,
      estimate,
      spawned: result === OK
    };
  }
  return undefined; // no valid builds
}

const orderBoosts = (
  office: string,
  name: string,
  boosts: { type: MineralBoostConstant; count: number }[]
): BoostOrder | undefined => {
  if (!boosts.length || !roomPlans(office)?.labs?.labs.some(l => l.structure)) return undefined;
  if (!FEATURES.LABS) throw new Error('Boosts disabled');
  const order: BoostOrder = {
    name,
    boosts: []
  };
  for (const boost of boosts) {
    let available = boostsAvailable(office, boost.type, true);
    if (available && available >= boost.count * LAB_BOOST_MINERAL) {
      // We have enough minerals, enter a boost order
      order.boosts.push({
        type: boost.type,
        count: boost.count * LAB_BOOST_MINERAL
      });
    } else {
      throw new Error(`Not enough resources to boost order "${name}": ${JSON.stringify(boosts)}`);
    }
  }
  return order;
};
