import { CreepBuild, unboosted } from './utils';

export const buildLawyer = (energy: number): CreepBuild[] => {
  if (energy < 850) {
    return [];
  } else {
    return unboosted([CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE]);
  }
};
