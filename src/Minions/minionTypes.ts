import { minionCost } from 'Selectors/minionCostPerTick';
import { memoize } from 'utils/memoizeFunction';

export interface CreepBuild {
  body: BodyPartConstant[];
  boosts: {
    type: MineralBoostConstant;
    count: number;
  }[];
}

export enum MinionTypes {
  ACCOUNTANT = 'ACCOUNTANT',
  CLERK = 'CLERK',
  ENGINEER = 'ENGINEER',
  PAVER = 'PAVER',
  FOREMAN = 'FOREMAN',
  GUARD = 'GUARD',
  AUDITOR = 'AUDITOR',
  LAWYER = 'LAWYER',
  RESEARCH = 'PARALEGAL',
  SALESMAN = 'SALESMAN',
  MARKETER = 'MARKETER',
  BLINKY = 'BLINKY',
  MEDIC = 'MEDIC',
  POWER_BANK_ATTACKER = 'PBA',
  POWER_BANK_HEALER = 'PBH'
}

interface buildFromSegmentOpts {
  maxSegments: number;
  sorted: boolean;
  suffix: BodyPartConstant[];
}

const unboosted = (body: BodyPartConstant[]): CreepBuild[] => [
  {
    body,
    boosts: []
  }
];

function buildFromSegment(energy: number, segment: BodyPartConstant[], opts: Partial<buildFromSegmentOpts> = {}) {
  if (segment.length === 0 || energy === 0) return [];
  const actualOpts = {
    maxSegments: Infinity,
    sorted: false,
    suffix: [] as BodyPartConstant[],
    ...opts
  };
  energy -= minionCost(actualOpts.suffix);
  const segmentCost = minionCost(segment);
  if (energy < segmentCost) {
    console.log('Minion builder error:', energy, 'not enough for segment', JSON.stringify(segment));
  }
  const segmentCount = Math.min(
    Math.floor(energy / segmentCost),
    Math.floor((50 - actualOpts.suffix.length) / segment.length),
    actualOpts.maxSegments
  );
  const body = new Array(segmentCount).fill(segment).flat();
  if (actualOpts.sorted) body.sort().reverse();
  body.push(...actualOpts.suffix);
  return body;
}

export const MinionBuilders = {
  [MinionTypes.CLERK]: (energy: number, maxSegments = 50, mobile = false): CreepBuild[] => {
    return unboosted(buildFromSegment(energy, [CARRY], { maxSegments, suffix: [MOVE] }));
  },
  [MinionTypes.ACCOUNTANT]: memoize(
    // Memoizes at 50-energy increments
    (energy: number, maxSegments = 25, roads = false, repair = false) =>
      `${Math.round((energy * 2) / 100)} ${maxSegments} ${roads}`,
    (energy: number, maxSegments = 25, roads = false, repair = false): CreepBuild[] => {
      const suffix = repair ? (roads ? [WORK, CARRY, MOVE] : [WORK, MOVE]) : [];
      if (energy < 100 || maxSegments === 0) {
        return [];
      } else if (energy < 5600) {
        // Before we have two spawns, create smaller haulers
        if (!roads) {
          return unboosted(buildFromSegment(energy, [CARRY, MOVE], { maxSegments: Math.min(maxSegments, 13), suffix }));
        } else {
          return unboosted(
            buildFromSegment(energy, [CARRY, CARRY, MOVE], { maxSegments: Math.min(maxSegments, 13), suffix })
          );
        }
      } else {
        if (!roads) {
          return unboosted(buildFromSegment(energy, [CARRY, MOVE], { maxSegments, suffix }));
        } else {
          return unboosted(buildFromSegment(energy, [CARRY, CARRY, MOVE], { maxSegments, suffix }));
        }
      }
    }
  ),
  [MinionTypes.ENGINEER]: (energy: number, roads = false, near = false): CreepBuild[] => {
    if (near) {
      if (roads) {
        return unboosted(buildFromSegment(energy, [WORK, MOVE, CARRY, CARRY]));
      } else {
        return unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, CARRY, CARRY]));
      }
    } else {
      if (roads) {
        if (energy <= 500) return unboosted(buildFromSegment(energy, [WORK, MOVE, CARRY, CARRY]));
        return unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY]));
      } else {
        if (energy <= 550) return unboosted(buildFromSegment(energy, [WORK, MOVE, MOVE, CARRY, CARRY]));
        if (energy <= 1800)
          return unboosted(
            buildFromSegment(energy, [WORK, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY])
          );
        // prettier-ignore
        return unboosted([
          WORK, WORK, WORK,
          MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE,
          CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY,
          CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY
        ])
      }
    }
  },
  [MinionTypes.FOREMAN]: (energy: number): CreepBuild[] => {
    if (energy < 550) {
      return [];
    } else {
      // Maintain 4-1 WORK-MOVE ratio
      return unboosted(buildFromSegment(energy, [WORK, WORK, WORK, WORK, MOVE]));
    }
  },
  [MinionTypes.GUARD]: (energy: number, heal = false): CreepBuild[] => {
    if (energy < 200) {
      return [];
    } else if (heal && energy >= 420) {
      // Add a heal part
      return unboosted(buildFromSegment(energy, [ATTACK, MOVE], { sorted: true, suffix: [HEAL, MOVE] }));
    } else {
      return unboosted(buildFromSegment(energy, [ATTACK, MOVE], { sorted: true }));
    }
  },
  [MinionTypes.AUDITOR]: (energy: number): CreepBuild[] => {
    return unboosted([MOVE]);
  },
  [MinionTypes.LAWYER]: (energy: number): CreepBuild[] => {
    if (energy < 850) {
      return [];
    } else {
      return unboosted([CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE]);
    }
  },
  [MinionTypes.MARKETER]: (energy: number): CreepBuild[] => {
    if (energy < 650) {
      return [];
    } else {
      return unboosted(buildFromSegment(energy, [CLAIM, MOVE], { maxSegments: 5 }));
    }
  },
  [MinionTypes.RESEARCH]: (energy: number, maxWorkParts = 15): CreepBuild[] => {
    if (energy < 250 || maxWorkParts <= 0) {
      return [];
    } else {
      // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
      let workParts = Math.max(1, Math.min(Math.floor(maxWorkParts), Math.floor((energy * 10) / 13 / 100)));
      let carryParts = Math.max(1, Math.min(3, Math.floor((energy * 1) / 13 / 50)));
      let moveParts = Math.max(1, Math.min(6, Math.floor((energy * 2) / 13 / 50)));
      // console.log(energy, maxWorkParts, workParts)
      return unboosted(
        ([] as BodyPartConstant[]).concat(
          Array(workParts).fill(WORK),
          Array(carryParts).fill(CARRY),
          Array(moveParts).fill(MOVE)
        )
      );
    }
  },
  [MinionTypes.SALESMAN]: (energy: number, link = false, remote = false): CreepBuild[] => {
    if (energy < 200) {
      return [];
    } else if (energy < 550) {
      return unboosted([WORK, WORK, MOVE]);
    } else if (energy === 550) {
      return link ? unboosted([WORK, WORK, WORK, CARRY, MOVE]) : unboosted([WORK, WORK, WORK, WORK, WORK, MOVE]);
    }

    if (remote) {
      return unboosted(buildFromSegment(energy, [WORK, WORK, WORK, MOVE], { maxSegments: 2, suffix: [CARRY] }));
    } else {
      return unboosted(
        buildFromSegment(energy, [WORK, WORK, WORK, WORK, WORK, MOVE], {
          maxSegments: 2,
          suffix: link ? [CARRY] : []
        })
      );
    }
  },
  [MinionTypes.BLINKY]: (energy: number): CreepBuild[] => {
    if (energy < 200) {
      return [];
    } else if (energy < 1000) {
      return unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE], { sorted: true }));
    } else {
      return unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE, MOVE, HEAL], { sorted: true }));
    }
  },
  [MinionTypes.MEDIC]: (energy: number) => {
    if (energy < 200) {
      return [];
    } else {
      return unboosted(buildFromSegment(energy, [HEAL, MOVE], { sorted: true }));
    }
  },
  [MinionTypes.POWER_BANK_ATTACKER]: (energy: number, speed: number): CreepBuild[] => {
    const attackParts = speed === 1 ? 22 : 29;
    const moveParts = speed === 1 ? 28 : 21;
    const body = ([] as BodyPartConstant[]).concat(Array(moveParts).fill(MOVE), Array(attackParts).fill(ATTACK));
    if (energy < minionCost(body)) {
      return [];
    } else {
      return unboosted(body);
    }
  },
  [MinionTypes.POWER_BANK_HEALER]: (energy: number, speed: number): CreepBuild[] => {
    const healParts = speed === 1 ? 28 : 37;
    const moveParts = speed === 1 ? 22 : 13;
    const body = ([] as BodyPartConstant[]).concat(Array(moveParts).fill(MOVE), Array(healParts).fill(HEAL));
    if (energy < minionCost(body)) {
      return [];
    } else {
      return unboosted(body);
    }
  }
};
