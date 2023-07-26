import { boosted, buildFromSegment, CreepBuild, unboosted } from './utils';

export const buildBlinky = (energy: number): CreepBuild[] => {
  if (energy < 200) {
    return [];
  } else if (energy < 1000) {
    return [unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE], { sorted: true }))];
  } else {
    return [unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE, MOVE, HEAL], { sorted: true }))];
  }
};

export const buildBlinkyWithBoosts = (energy: number): CreepBuild[] => {
  if (energy < 200) {
    return [];
  } else if (energy < 1000) {
    return [
      unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE], { sorted: true })),
      boosted(
        buildFromSegment(energy, [RANGED_ATTACK, RANGED_ATTACK, MOVE], { sorted: true }),
        { [RANGED_ATTACK]: RESOURCE_KEANIUM_OXIDE, [MOVE]: RESOURCE_ZYNTHIUM_OXIDE }
      ),
      boosted(
        buildFromSegment(energy, [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE], { sorted: true }),
        { [RANGED_ATTACK]: RESOURCE_KEANIUM_ALKALIDE, [MOVE]: RESOURCE_ZYNTHIUM_ALKALIDE }
      ),
      boosted(
        buildFromSegment(energy, [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE], { sorted: true }),
        { [RANGED_ATTACK]: RESOURCE_CATALYZED_KEANIUM_ALKALIDE, [MOVE]: RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE }
      ),
    ]
  } else {
    return [
      unboosted(buildFromSegment(energy, [RANGED_ATTACK, MOVE, MOVE, HEAL], { sorted: true })),
      boosted(
        buildFromSegment(energy, [RANGED_ATTACK, MOVE, HEAL], { sorted: true }),
        { [RANGED_ATTACK]: RESOURCE_KEANIUM_OXIDE, [MOVE]: RESOURCE_ZYNTHIUM_OXIDE, [HEAL]: RESOURCE_LEMERGIUM_OXIDE }
      ),
      boosted(
        buildFromSegment(energy, [RANGED_ATTACK, RANGED_ATTACK, MOVE, HEAL], { sorted: true }),
        { [RANGED_ATTACK]: RESOURCE_KEANIUM_ALKALIDE, [MOVE]: RESOURCE_ZYNTHIUM_ALKALIDE, [HEAL]: RESOURCE_LEMERGIUM_ALKALIDE }
      ),
      boosted(
        [
          ...Array(11).fill(TOUGH),
          ...Array(10).fill(MOVE),
          ...Array(23).fill(HEAL),
          ...Array(6).fill(RANGED_ATTACK),
        ],
        {
          [TOUGH]: RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
          [RANGED_ATTACK]: RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
          [MOVE]: RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
          [HEAL]: RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE
        }
      ),
    ]
  }
};
