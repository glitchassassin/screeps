/*
 * A set of functions that makes creeps tell other creeps to get out of the way using creep memory
 *
 * call so creep reacts to being nudged
 * Creep.giveWay() - swaps places with creep that nudged it
 * Creep.giveWay(true) - moves into random available spot
 * Creep.giveWay({pos: controller.pos, range: 3 }) - moves into random available spot in range of target, if none are avaiable fallbacks to random spot
 */

import profiler from 'utils/profiler';

/*
 * if alwaysNudge false you have to call Creep.move with additional argument -
 * creep.move(direction, true); - for creep to nudge other creeps,
 * so it's not compatible with creep.moveTo
 *
 * if alwaysNudge is true then creeps... always nudge creeps in front of them
 */
const alwaysNudge = true;

/*
 * type declarations
 */
declare global {
  interface Creep {
    moveTargets?: {
      pos: RoomPosition;
      range: number;
    }[];
    giveWay(nudgeDirection?: DirectionConstant): void;
    move(direction: DirectionConstant | Creep, excuse?: boolean): CreepMoveReturnCode;
  }

  interface PowerCreep {
    moveTargets?: {
      pos: RoomPosition;
      range: number;
    }[];
    giveWay(nudgeDirection?: DirectionConstant): void;
    move(direction: DirectionConstant | Creep, excuse?: boolean): CreepMoveReturnCode;
  }
  interface CreepMemory {
    excuseMe?: DirectionConstant;
  }
  interface PowerCreepMemory {
    excuseMe?: DirectionConstant;
  }
}

/*
 * some utils that I'm using
 */
const offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
const offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
function getRandomDir() {
  return (Math.floor(Math.random() * 8) + 1) as DirectionConstant;
}
function getOppositeDir(dir: DirectionConstant) {
  return (((dir + 3) % 8) + 1) as DirectionConstant;
}

/*
 * returns a weighted random direction from given position
 * prefers empty tiles over ones with creeps
 * never picks a direction that would result in hitting a wall or an obstacle structure
 */
function getNudgeDirection_Random(pos: RoomPosition) {
  const room = Game.rooms[pos.roomName];
  const terrain = Game.map.getRoomTerrain(pos.roomName);
  let totalWeight = 0;
  let dirCandidates = new Uint8Array(9);
  for (let dir = TOP; dir <= TOP_LEFT; ++dir) {
    let posX = pos.x + offsetX[dir];
    let posY = pos.y + offsetY[dir];
    if (posX < 1 || posX > 48 || posY < 1 || posY > 48) continue;
    if ((terrain.get(posX, posY) & TERRAIN_MASK_WALL) > 0) continue;
    if (
      room
        .lookForAt(LOOK_STRUCTURES, posX, posY)
        .find(s => (OBSTACLE_OBJECT_TYPES as string[]).includes(s.structureType))
    )
      continue;

    const hasCreeps = room.lookForAt(LOOK_CREEPS, posX, posY).length > 0;
    const addWeight = hasCreeps ? 1 : 2;
    dirCandidates[dir] += addWeight;
    totalWeight += dirCandidates[dir];
  }

  let sum = 0;
  let rnd = _.random(1, totalWeight, false);
  for (let dir = TOP; dir <= TOP_LEFT; ++dir) {
    if (dirCandidates[dir] > 0) {
      sum += dirCandidates[dir];
      if (rnd <= sum) {
        return dir;
      }
    }
  }

  // this should never happen, unless creep is spawned into a corner
  // or structure is built next to it and seals the only path out
  return getRandomDir();
}

/*
 * returns a weighted random direction from given position
 * tries to stay in targets range, if it's impossible then fallbacks to random direction
 * prefers empty tiles over ones with creeps
 * never picks a direction that would result in hitting a wall or an obstacle structure
 */
function getNudgeDirection_KeepRange(pos: RoomPosition, target: { pos: RoomPosition; range: number }) {
  if (pos.isEqualTo(target.pos) && target.range === 0) return undefined;
  const room = Game.rooms[pos.roomName];
  const terrain = Game.map.getRoomTerrain(pos.roomName);
  let keepRangeTotalWeight = 0;
  let keepRangeDirCandidates = new Uint8Array(9);
  let randomTotalWeight = 0;
  let randomDirCandidates = new Uint8Array(9);
  for (let dir = TOP; dir <= TOP_LEFT; ++dir) {
    let posX = pos.x + offsetX[dir];
    let posY = pos.y + offsetY[dir];
    if (posX < 1 || posX > 48 || posY < 1 || posY > 48) continue;
    if ((terrain.get(posX, posY) & TERRAIN_MASK_WALL) > 0) continue;
    if (
      room
        .lookForAt(LOOK_STRUCTURES, posX, posY)
        .find(s => (OBSTACLE_OBJECT_TYPES as string[]).includes(s.structureType))
    )
      continue;

    const hasCreeps = room.lookForAt(LOOK_CREEPS, posX, posY).length > 0;
    const addWeight = hasCreeps ? 1 : 2;
    randomDirCandidates[dir] += addWeight;
    if (target.pos.inRangeTo(posX, posY, target.range)) keepRangeDirCandidates[dir] += addWeight;
    keepRangeTotalWeight += keepRangeDirCandidates[dir];
    randomTotalWeight += randomDirCandidates[dir];
  }

  const dirCandidates = keepRangeTotalWeight > 0 ? keepRangeDirCandidates : randomDirCandidates;
  const totalWeight = keepRangeTotalWeight > 0 ? keepRangeTotalWeight : randomTotalWeight;
  let sum = 0;
  if (totalWeight > 0) {
    let rnd = _.random(1, totalWeight, false);
    for (let dir = TOP; dir <= TOP_LEFT; ++dir) {
      if (dirCandidates[dir] > 0) {
        sum += dirCandidates[dir];
        if (rnd <= sum) {
          return dir;
        }
      }
    }
  }

  // this should never happen, unless creep is spawned into a corner
  // or structure is built next to it and seals the only path out
  return getRandomDir();
}

/*
 * a nudge
 */
function excuseMe(pos: RoomPosition, direction: DirectionConstant) {
  const nextX = pos.x + offsetX[direction];
  const nextY = pos.y + offsetY[direction];
  if (nextX > 49 || nextX < 0 || nextY > 49 || nextY < 0) return;

  const room = Game.rooms[pos.roomName];
  const creeps = room.lookForAt(LOOK_CREEPS, nextX, nextY);
  if (creeps.length > 0 && creeps[0].my) {
    creeps[0].giveWay();
  }
  const powerCreeps = room.lookForAt(LOOK_POWER_CREEPS, nextX, nextY);
  if (powerCreeps.length > 0 && powerCreeps[0].my) powerCreeps[0].giveWay();
}

/*
 *
 */
let movingThisTick = new Set<Id<Creep | PowerCreep>>();
const move = Creep.prototype.move;
Creep.prototype.move = function (this: Creep, direction: DirectionConstant | Creep, nudge?: boolean) {
  movingThisTick.add(this.id);
  if ((alwaysNudge || nudge) && _.isNumber(direction) && !this.fatigue) excuseMe(this.pos, direction);
  return move.call(this, direction);
} as typeof move;

/*
 * call this on creeps that should react to being nudged
 * Returns false if already moving out of the way or refused
 * to be nudged
 */
function giveWay(creep: AnyCreep, nudgeDirection?: DirectionConstant) {
  let target = creep.moveTargets?.find(({ pos, range }) => pos.inRangeTo(creep, range));
  // if (target) {
  //   viz(creep.pos.roomName)
  //     .line(creep.pos, target.pos, { color: 'magenta', lineStyle: 'dotted' })
  //     .rect(
  //       target.pos.x - target.range - 0.5,
  //       target.pos.y - target.range - 0.5,
  //       target.range * 2 + 1,
  //       target.range * 2 + 1,
  //       {
  //         stroke: 'magenta',
  //         fill: 'transparent'
  //       }
  //     );
  // }
  let { pos, range } = target ?? {};
  if (!movingThisTick.has(creep.id)) {
    if (!pos && nudgeDirection) {
      creep.move(nudgeDirection, true);
    } else if (pos && range) {
      const dir = getNudgeDirection_KeepRange(creep.pos, { pos, range });
      if (dir) {
        creep.move(dir, true);
      } else {
        return false;
      }
    } else {
      creep.move(getNudgeDirection_Random(creep.pos), true);
    }
  } else {
    return false;
  }
  return true;
}
Creep.prototype.moveTargets = [];
Creep.prototype.giveWay = function (nudgeDirection?: DirectionConstant) {
  giveWay(this, nudgeDirection);
};
PowerCreep.prototype.moveTargets = [];
PowerCreep.prototype.giveWay = function (nudgeDirection?: DirectionConstant) {
  giveWay(this, nudgeDirection);
};

/*
 * clears nudges from memory of creeps that moved
 * call on tick start
 */
export const clearNudges = profiler.registerFN(() => {
  movingThisTick = new Set();
}, 'clearNudges');
