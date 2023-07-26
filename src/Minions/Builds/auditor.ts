import { CreepBuild, unboosted } from './utils';

export const buildAuditor = (): CreepBuild[] => {
  return [unboosted([MOVE])];
};
