import { STORAGE_LEVEL } from 'config';
import { BUILD_COSTS_BY_RCL } from 'gameConstants';
import { rcl } from './rcl';
import { roomPlans } from './roomPlans';
import { constructionToDo } from './Structures/facilitiesWorkToDo';

export const getStorageBudget = (office: string) => {
  if (!roomPlans(office)?.headquarters?.storage.structure) return CONTAINER_CAPACITY * 0.5;
  const effectiveRcl = constructionToDo(office).length ? rcl(office) - 1 : rcl(office);
  return Math.min(STORAGE_CAPACITY * 0.8, (STORAGE_LEVEL[effectiveRcl] ?? 0) + (BUILD_COSTS_BY_RCL[effectiveRcl] ?? 0));
};
