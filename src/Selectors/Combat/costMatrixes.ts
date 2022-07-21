import { findHostileCreeps } from "Selectors/findHostileCreeps";
import { calculateNearbyPositions } from "Selectors/Map/MapCoordinates";
import { combatStats } from "./combatStats";

let _enemyDamageCostMatrix = new Map<string, CostMatrix>();
let _enemyHealingCostMatrix = new Map<string, CostMatrix>();
let _myDamageCostMatrix = new Map<string, CostMatrix>();
let _myHealingCostMatrix = new Map<string, CostMatrix>();
let _evaluated = 0;

// Calculate damage/healing cost matrixes per room per tick, on demand
const calculateAllCostMatrixes = (room: string) => {
  if (!Game.rooms[room]) return;
  if (_evaluated !== Game.time) {
    _evaluated = Game.time;
    _enemyDamageCostMatrix = new Map();
    _enemyHealingCostMatrix = new Map();
    _myDamageCostMatrix = new Map();
    _myHealingCostMatrix = new Map();
  }
  if (_enemyDamageCostMatrix.has(room) && _enemyHealingCostMatrix.has(room)) return;
  const { damage, healing } = calculateCostMatrixes(findHostileCreeps(room));
  _enemyDamageCostMatrix.set(room, damage);
  _enemyHealingCostMatrix.set(room, healing);
  const { damage: myDamage, healing: myHealing } = calculateCostMatrixes(Game.rooms[room].find(FIND_MY_CREEPS));
  _myDamageCostMatrix.set(room, myDamage);
  _myHealingCostMatrix.set(room, myHealing);
}

const calculateCostMatrixes = (creeps: Creep[]) => {
  const damage = new PathFinder.CostMatrix();
  const healing = new PathFinder.CostMatrix();
  creeps.forEach(c => {
    const stats = combatStats(c);
    const closeSquares = calculateNearbyPositions(c.pos, 1, true);
    const rangedSquares = calculateNearbyPositions(c.pos, 3, false).filter(pos => pos.getRangeTo(c.pos) > 1);
    for (const pos of closeSquares) {
      damage.set(pos.x, pos.y, damage.get(pos.x, pos.y) + Math.max(stats.attack, stats.rangedAttack))
      healing.set(pos.x, pos.y, healing.get(pos.x, pos.y) + stats.heal)
    }
    for (const pos of rangedSquares) {
      damage.set(pos.x, pos.y, damage.get(pos.x, pos.y) + stats.rangedAttack)
      healing.set(pos.x, pos.y, healing.get(pos.x, pos.y) + stats.rangedHeal)
    }
  })

  return { damage, healing };
}

export const enemyDamageCostMatrix = (room: string) => {
  calculateAllCostMatrixes(room);
  return _enemyDamageCostMatrix;
}

export const enemyHealingCostMatrix = (room: string) => {
  calculateAllCostMatrixes(room);
  return _enemyDamageCostMatrix;
}

export const myDamageCostMatrix = (room: string) => {
  calculateAllCostMatrixes(room);
  return _myDamageCostMatrix;
}

export const myHealingCostMatrix = (room: string) => {
  calculateAllCostMatrixes(room);
  return _myDamageCostMatrix;
}

export const myDamageNet = (pos: RoomPosition) => {
  return (_myDamageCostMatrix.get(pos.roomName)?.get(pos.x, pos.y) ?? 0) -
        (_enemyHealingCostMatrix.get(pos.roomName)?.get(pos.x, pos.y) ?? 0)
}
