import { BOOSTS_BY_INTENT } from 'gameConstants';
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
    return [];
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
      const suffix = energy < 350 ? [] : repair ? (roads ? [WORK, CARRY, MOVE] : [WORK, MOVE]) : [];
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
  [MinionTypes.FOREMAN]: (energy: number, maxTier: 0 | 1 | 2 | 3 = 3): CreepBuild[] => {
    const tiers = [3, 2, 1, undefined].filter(tier => !tier || tier <= maxTier);
    if (energy < 550) {
      return [];
    } else {
      // Maintain 4-1 WORK-MOVE ratio
      const body = buildFromSegment(energy, [WORK, WORK, WORK, WORK, MOVE]);
      const count = body.filter(p => p === WORK).length;
      // boost, when available
      return tiers.map(tier => ({
        body,
        boosts: tier ? [{ type: BOOSTS_BY_INTENT.UPGRADE[tier - 1], count }] : []
      }));
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
      const body = ([] as BodyPartConstant[]).concat(
        Array(workParts).fill(WORK),
        Array(carryParts).fill(CARRY),
        Array(moveParts).fill(MOVE)
      );
      // any level of boosts, depending on availability
      return [
        { body, boosts: [{ type: BOOSTS_BY_INTENT.UPGRADE[2], count: workParts }] },
        { body, boosts: [{ type: BOOSTS_BY_INTENT.UPGRADE[1], count: workParts }] },
        { body, boosts: [{ type: BOOSTS_BY_INTENT.UPGRADE[0], count: workParts }] },
        { body, boosts: [] }
      ];
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
  [MinionTypes.POWER_BANK_ATTACKER]: (energy: number, maxTier: number = 3): CreepBuild[] => {
    const builds: CreepBuild[] = [];
    const tiers = [
      { tough: 2, attack: 38, move: 10, tier: 3 },
      { tough: 3, attack: 34, move: 13, tier: 2 },
      { tough: 3, attack: 30, move: 17, tier: 1 }
      // { attack: 22, move: 28 }, // no unboosted power bank duos
    ].filter(({ tier }) => !tier || tier <= maxTier);
    for (const { tough, attack, move, tier } of tiers) {
      const body = ([] as BodyPartConstant[]).concat(
        Array(tough).fill(TOUGH),
        Array(move).fill(MOVE),
        Array(attack).fill(ATTACK)
      );
      builds.push({
        body,
        boosts: tier
          ? [
              { type: BOOSTS_BY_INTENT.TOUGH[tier - 1], count: tough },
              { type: BOOSTS_BY_INTENT.ATTACK[tier - 1], count: attack },
              { type: BOOSTS_BY_INTENT.MOVE[tier - 1], count: move }
            ]
          : []
      });
    }
    return builds;
  },
  [MinionTypes.POWER_BANK_HEALER]: (energy: number, maxTier: number = 3): CreepBuild[] => {
    const builds: CreepBuild[] = [];
    const tiers = [
      { heal: 38, move: 10, tier: 3 },
      { heal: 35, move: 11, tier: 2 },
      { heal: 33, move: 16, tier: 1 }
      // { heal: 28, move: 22 }, // no unboosted power bank duos
    ].filter(({ tier }) => !tier || tier <= maxTier);
    for (const { heal, move, tier } of tiers) {
      const body = ([] as BodyPartConstant[]).concat(Array(move).fill(MOVE), Array(heal).fill(HEAL));
      builds.push({
        body,
        boosts: tier
          ? [
              { type: BOOSTS_BY_INTENT.HEAL[tier - 1], count: heal },
              { type: BOOSTS_BY_INTENT.MOVE[tier - 1], count: move }
            ]
          : []
      });
    }
    return builds;
  }
};
