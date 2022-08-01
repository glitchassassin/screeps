import { FastfillerPlan, HeadquartersPlan, LabsPlan } from 'RoomPlanner';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { validateHeadquartersPlan } from 'RoomPlanner/Stamps/validateHeadquartersPlan';
import { validateLabsPlan } from 'RoomPlanner/Stamps/validateLabsPlan';
import { getCostMatrix } from 'Selectors/Map/Pathing';
import { viz } from 'Selectors/viz';
import { memoize } from 'utils/memoizeFunction';
import { Coord, packCoordList } from 'utils/packrat';
import { applyStamp, fitStamp } from './fitStamp';
import { pointsOfInterest } from './pointsOfInterest';
import { FASTFILLER_STAMP, FASTFILLER_STAMP_SPAWN_ORDER, HQ_STAMP, LABS_STAMP, LABS_STAMP_ORDER } from './stamps';
import { validateFastfillerPlan } from './validateFastfillerPlan';

const stamps = [FASTFILLER_STAMP, HQ_STAMP, LABS_STAMP];
const EXIT_WEIGHT = 2;
const CONTROLLER_WEIGHT = 2;
const SOURCE_WEIGHT = 1;
const LABS_FASTFILLER_WEIGHT = 1;
const LABS_HQ_WEIGHT = 10;
const HQ_FASTFILLER_WEIGHT = 2;
const TOP_N_LAYOUTS = 7;

/**
 * Lower score is better
 */
const scoreLayout = memoize(
  (room, layout) => room + packCoordList(layout),
  (room: string, layout: { x: number; y: number }[]) => {
    const flowfields = pointsOfInterest(room);
    if (layout.length === 0) return Infinity; // no stamps laid out!
    const [fastFillerPos, hqPos, labsPos] = layout.map((p, i) => {
      const offset = 0; // Math.floor(stamps[i].length / 2);
      return { x: p.x - offset, y: p.y - offset };
    });

    let score = 0;
    if (fastFillerPos) {
      score += flowfields.controller.get(fastFillerPos.x, fastFillerPos.y) * CONTROLLER_WEIGHT;
      score += flowfields.source1.get(fastFillerPos.x, fastFillerPos.y) * SOURCE_WEIGHT;
      score += flowfields.source1.get(fastFillerPos.x, fastFillerPos.y) * SOURCE_WEIGHT;
      score += (50 - flowfields.exits.get(fastFillerPos.x, fastFillerPos.y)) * EXIT_WEIGHT;
      console.log('fastFiller', score);
    }
    if (hqPos) {
      score += flowfields.controller.get(hqPos.x, hqPos.y) * CONTROLLER_WEIGHT;
      score += flowfields.source1.get(hqPos.x, hqPos.y) * SOURCE_WEIGHT;
      score += flowfields.source1.get(hqPos.x, hqPos.y) * SOURCE_WEIGHT;
      score += (50 - flowfields.exits.get(hqPos.x, hqPos.y)) * EXIT_WEIGHT;
      console.log('hq', score);
    }
    if (labsPos) {
      score += (50 - flowfields.exits.get(labsPos.x, labsPos.y)) * EXIT_WEIGHT;
      console.log('labs', score);
    }
    if (hqPos && fastFillerPos) {
      score +=
        Math.max(Math.abs(hqPos.x - fastFillerPos.x), Math.abs(hqPos.y - fastFillerPos.y)) * HQ_FASTFILLER_WEIGHT;
      console.log('hq_fastfiller', score);
    }
    if (labsPos && fastFillerPos) {
      score +=
        Math.max(Math.abs(labsPos.x - fastFillerPos.x), Math.abs(labsPos.y - fastFillerPos.y)) * LABS_FASTFILLER_WEIGHT;
      console.log('labs_fastfiller', score);
    }
    if (hqPos && labsPos) {
      score += Math.max(Math.abs(hqPos.x - labsPos.x), Math.abs(hqPos.y - labsPos.y)) * LABS_HQ_WEIGHT;
      console.log('hq_labs', score);
    }

    return score;
  }
);

let layoutsCache = new Map<string, Coord[]>();
export function calculateLayout(room: string) {
  if (layoutsCache.has(room)) {
    return {
      layout: layoutsCache.get(room)!,
      stamps
    };
  }

  const start = Game.cpu.getUsed();
  const cm = getCostMatrix(room, false, { ignoreStructures: true, terrain: true });
  // possibilities will be an array of possible positions, e.g. [[0, 1], [10, 15]]
  // each new stamp iterated over will extend the array, e.g. [[0, 1], [10, 15], [17, 20]]
  // but it may also eliminate some items from consideration
  let possibilities: Coord[][] = [];

  for (const stamp of stamps) {
    console.log('possibilities.length', possibilities.length);
    console.log('stamp', stamp.length);
    const newPossibilities: Coord[][] = [];
    if (possibilities.length === 0) {
      newPossibilities.push(...fitStamp(room, stamp, cm).map(pos => [pos]));
    } else {
      possibilities.forEach(stampPositions => {
        const combinedCm = stampPositions.reduce((cm, pos, i) => applyStamp(stamps[i], pos, cm), cm);
        fitStamp(room, stamp, combinedCm).forEach(pos => {
          newPossibilities.push([...stampPositions, pos]);
        });
      });
    }
    possibilities = newPossibilities
      .sort((a, b) => scoreLayout(room, a) - scoreLayout(room, b))
      .slice(0, TOP_N_LAYOUTS);
  }
  if (possibilities.length === 0) throw new Error('No possible layouts found');

  layoutsCache.set(room, possibilities[0]);

  console.log('Layout planned in', Game.cpu.getUsed() - start, 'ms');
  return { layout: possibilities[0], stamps };
}

export function planMainStamps(room: string) {
  if (!Memory.rooms[room]) throw new Error('No data cached for planning room');
  let sources = Memory.rooms[room].sourceIds ?? [];
  if (sources.length < 2) throw new Error('Expected two sources for headquarters planning');

  const { layout, stamps } = calculateLayout(room);

  const hq: Partial<HeadquartersPlan> = {
    nuker: undefined,
    link: undefined,
    factory: undefined,
    powerSpawn: undefined,
    storage: undefined,
    terminal: undefined,
    extension: undefined,
    roads: []
  };
  const fastfiller: Partial<FastfillerPlan> = {
    extensions: [],
    spawns: [],
    roads: [],
    containers: [],
    link: undefined
  };
  const labs: Partial<LabsPlan> = {
    labs: [],
    roads: []
  };

  layout.forEach((pos, i) => {
    if (stamps[i] === FASTFILLER_STAMP) {
      fastfiller.spawns = FASTFILLER_STAMP_SPAWN_ORDER.map(
        ([x, y]) => new PlannedStructure(new RoomPosition(pos.x + x, pos.y + y, room), STRUCTURE_SPAWN)
      );
      stamps[i].forEach((row, y) => {
        row.forEach((cell, x) => {
          const p = new RoomPosition(pos.x + x, pos.y + y, room);
          if (cell === STRUCTURE_EXTENSION) {
            fastfiller.extensions?.push(new PlannedStructure(p, STRUCTURE_EXTENSION));
          }
          if (cell === STRUCTURE_CONTAINER) {
            fastfiller.containers?.push(new PlannedStructure(p, STRUCTURE_CONTAINER));
          }
          if (cell === STRUCTURE_LINK) {
            fastfiller.link = new PlannedStructure(p, STRUCTURE_LINK);
          }
          if (cell === STRUCTURE_ROAD) {
            fastfiller.roads?.push(new PlannedStructure(p, STRUCTURE_ROAD));
          }
        });
      });
    } else if (stamps[i] === HQ_STAMP) {
      stamps[i].forEach((row, y) => {
        row.forEach((cell, x) => {
          let p = new RoomPosition(pos.x + x, pos.y + y, room);
          if (cell === STRUCTURE_POWER_SPAWN) {
            hq.powerSpawn = new PlannedStructure(p, STRUCTURE_POWER_SPAWN);
          }
          if (cell === STRUCTURE_FACTORY) {
            hq.factory = new PlannedStructure(p, STRUCTURE_FACTORY);
          }
          if (cell === STRUCTURE_LINK) {
            hq.link = new PlannedStructure(p, STRUCTURE_LINK);
          }
          if (cell === STRUCTURE_STORAGE) {
            hq.storage = new PlannedStructure(p, STRUCTURE_STORAGE);
          }
          if (cell === STRUCTURE_TERMINAL) {
            hq.terminal = new PlannedStructure(p, STRUCTURE_TERMINAL);
          }
          if (cell === STRUCTURE_ROAD) {
            hq.roads?.push(new PlannedStructure(p, STRUCTURE_ROAD));
          }
          if (cell === STRUCTURE_NUKER) {
            hq.nuker = new PlannedStructure(p, STRUCTURE_NUKER);
          }
          if (cell === STRUCTURE_EXTENSION) {
            hq.extension = new PlannedStructure(p, STRUCTURE_EXTENSION);
          }
        });
      });
    } else if (stamps[i] === LABS_STAMP) {
      labs.labs = LABS_STAMP_ORDER.map(
        ([x, y]) => new PlannedStructure(new RoomPosition(pos.x + x, pos.y + y, room), STRUCTURE_LAB)
      );
      stamps[i].forEach((row, y) => {
        row.forEach((cell, x) => {
          let p = new RoomPosition(pos.x + x, pos.y + y, room);
          if (cell === STRUCTURE_ROAD) {
            labs.roads?.push(new PlannedStructure(p, STRUCTURE_ROAD));
          }
        });
      });
    }
  });

  return {
    hq: validateHeadquartersPlan(hq),
    labs: validateLabsPlan(labs),
    fastfiller: validateFastfillerPlan(fastfiller)
  };
}

export function test(room: string) {
  const { layout, stamps } = calculateLayout(room);
  layout.forEach((pos, i) => {
    stamps[i].forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          viz(room).structure(x + pos.x, y + pos.y, cell);
        }
      });
    });
  });
}
