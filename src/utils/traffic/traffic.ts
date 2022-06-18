import { add } from "lodash";
import { blockSquare, calculateNearbyPositions, getRangeTo, pathsCostMatrix, setMove } from "Selectors/MapCoordinates";
import { memoizeByTick } from "../memoizeFunction";

const oldMoveTo = Creep.prototype.moveTo;
Creep.prototype.moveTo = (function (this: Creep, target: RoomPosition, opts?: MoveToOpts | undefined) {
  // Use the new move logic
  moveTo(this, target, opts);
}) as typeof oldMoveTo;

const DEBUG = false;

interface MoveTarget {
  pos: RoomPosition,
  range: number
}
interface MoveToOpts extends globalThis.MoveToOpts {
  flee?: boolean,
}

interface CachedMoveTargets {
  targets: MoveTarget[],
  opts?: MoveToOpts,
  needsToMove: boolean,
  shoveSquares?: RoomPosition[]
}

const moveToCache = memoizeByTick(() => 'moveToCache', () => new Map<Creep, CachedMoveTargets>())

export function moveTo(creep: Creep, targetOrTargets: RoomPosition | MoveTarget | MoveTarget[], opts?: MoveToOpts | undefined) {
  const targets: MoveTarget[] = [];
  if ('x' in targetOrTargets) { // RoomPosition
    targets.push({
      pos: targetOrTargets,
      range: opts?.range ?? 0 // default range
    })
  } else if ('pos' in targetOrTargets) { // MoveTarget
    targets.push(targetOrTargets);
  } else { // MoveTarget[]
    targets.push(...targetOrTargets);
  }

  // If the creep is in range of a move target, it does not need to move
  // If target has exactly one target, it is there, and it has range 0, then it does "need to move" to avoid being shoved
  const needsToMove = !targets.some(target => creep.pos.getRangeTo(target.pos) <= target.range) || targets.every(target => target.range === 0 && creep.pos.isEqualTo(target));

  if (DEBUG) new RoomVisual(creep.pos.roomName).circle(creep.pos.x, creep.pos.y, { radius: 0.5, fill: needsToMove ? 'red' : 'green' })

  moveToCache().set(creep, { targets, opts, needsToMove });

  return OK;
}

const posFulfillsMoveIntent = (pos: RoomPosition, intent: CachedMoveTargets) => {
  return intent.opts?.flee ?
    intent.targets.every(t => getRangeTo(t.pos, pos) > t.range) :
    intent.targets.some(t => getRangeTo(t.pos, pos) <= t.range)
}

export function handleMoves() {
  // Filter out already-moved minions

  let movingCreeps = [...moveToCache().keys()];
    //.sort(byTrafficPriority); // Traffic priority not implemented yet
  const movedCreeps: Creep[] = [];
  let shoveStack: Creep[] = [];
  let shoveCm: CostMatrix = pathsCostMatrix().clone();
  const plannedMoves = new Map<Creep, RoomPosition>();

  while (movingCreeps.length) {
    // Initialize shoveStack with the next minion
    if (!shoveStack.length) {
      shoveStack = movingCreeps.slice(0, 1);
      shoveCm = pathsCostMatrix().clone();
      if (DEBUG) console.log('Starting new shoveStack');
    }
    const creep = shoveStack[0];
    if (!creep) continue;

    if (DEBUG) console.log('Creep', creep.id, 'moving');

    // Try to move
    const cachedMove = moveToCache().get(creep)!;
    const { targets, opts, needsToMove } = cachedMove;

    if (!needsToMove && shoveStack.length === 1) {
      if (DEBUG) console.log('Creep', creep.id, 'doesn\'t need to move');
      movingCreeps = movingCreeps.filter(c => !shoveStack.includes(c));
      shoveStack.shift();
      continue;
    }

    if (shoveStack.length === 2 && posFulfillsMoveIntent(shoveStack[1].pos, cachedMove)) {
      // Shortcut heuristic: can just swap places
      if (DEBUG) console.log('Creep', creep.id, 'swapping places with', shoveStack[1].id);
      plannedMoves.set(creep, shoveStack[1].pos);
    } else {
      // Creep needs to move, so if its targets include the current square, replace them with targets that don't
      const filterTargetsToExclude = (pos: RoomPosition) =>
        opts?.flee ?
          targets.concat({ pos, range: 0 }) :
          targets.flatMap(t => getRangeTo(pos, t.pos) <= t.range ?
            calculateNearbyPositions(t.pos, t.range)
              .filter(p => !pos.isEqualTo(p))
              .map(pos => ({ pos, range: 0 })) :
            [t]
          )
      const path = PathFinder.search(creep.pos, filterTargetsToExclude(creep.pos), {
        ...opts,
        costMatrix: opts?.costMatrix ?
          add(opts.costMatrix, shoveCm) :
          shoveCm,
      });

      const nextStep = path.path[0];

      if (!nextStep || creep.fatigue) {
        // This creep cannot move; back up and try another path
        blockSquare(creep.pos);
        movingCreeps = movingCreeps.filter(c => c !== creep)
        movedCreeps.push(creep);
        shoveStack.shift();

        if (DEBUG) console.log('Creep', creep.id, 'cannot move, backing up');
        continue;
      }

      if (DEBUG) console.log('Creep', creep.id, 'planning to move to', nextStep);
      plannedMoves.set(creep, nextStep);
      setMove(nextStep);
      shoveCm.set(nextStep.x, nextStep.y, 255)
      // new Visual().poly([creep, nextStep], { fill: 'transparent' });
      if (DEBUG && targets.length > 1) new RoomVisual(creep.pos.roomName).poly([creep.pos, ...path.path], { fill: 'transparent' });

      const blockingCreep = nextStep.lookFor(LOOK_CREEPS).find(c => c.my);

      if (blockingCreep && !movedCreeps.includes(blockingCreep) && !shoveStack.includes(blockingCreep)) {
        if (DEBUG) console.log('Creep', creep.id, 'blocked by', blockingCreep.id);
        const cachedMove = moveToCache().get(blockingCreep);
        if (!cachedMove) {
          // Default "shove" cached move - Flee this square
          if (DEBUG) console.log('Creep', creep.id, 'telling', blockingCreep.id, 'to vacate square');
          moveToCache().set(blockingCreep, {
            targets: [{ pos: blockingCreep.pos, range: 0 }],
            opts: { flee: true },
            needsToMove: true
          })
        } else if (!cachedMove.needsToMove) {
          if (DEBUG) console.log('Creep', creep.id, 'telling', blockingCreep.id, 'to go to a preferred square');
          moveToCache().set(blockingCreep, {
            ...cachedMove,
            needsToMove: true
          })
        }
        if (DEBUG) console.log('Handling blocking creep', blockingCreep.id);
        // Resolve move for blocking creep
        shoveStack.unshift(blockingCreep);
        continue;
      }
    }

    if (DEBUG) console.log('Shove chain handled', shoveStack.map(c => c.id));
    // Shove chain resolved: execute moves and remove from movingCreeps
    movedCreeps.push(...shoveStack);
    movingCreeps = movingCreeps.filter(c => !shoveStack.includes(c));
    shoveStack.forEach(creep => {
      const nextStep = plannedMoves.get(creep)!;
      creep.move(creep.pos.getDirectionTo(nextStep))
    })
    shoveStack = [];
  }
}
