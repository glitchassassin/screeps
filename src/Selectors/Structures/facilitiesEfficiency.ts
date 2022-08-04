import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { getFranchiseDistance } from 'Selectors/getFranchiseDistance';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { franchisesThatNeedRoadWork } from 'Selectors/plannedTerritoryRoads';
import { rcl } from 'Selectors/rcl';
import { roomPlans } from 'Selectors/roomPlans';
import { memoizeByTick } from 'utils/memoizeFunction';
import { facilitiesWorkToDo, facilitiesWorkToDoAverageRange } from './facilitiesWorkToDo';

export const facilitiesEfficiency = memoizeByTick(
  (office, creep) => office + creep.join(''),
  (office: string, creep: BodyPartConstant[]) => {
    let work = facilitiesWorkToDo(office).slice(0, 20);
    let range = facilitiesWorkToDoAverageRange(office);
    let constructionToDo = work.filter(s => !s.structure).length > 0;
    if (!work.length) {
      const franchises = franchisesThatNeedRoadWork(office);
      if (!franchises.length) return 0.5;
      range = franchises.reduce((sum, f) => sum + (getFranchiseDistance(office, f) ?? 0), 0) / franchises.length;
      constructionToDo = true;
    }
    let carryParts = 0;
    let moveParts = 0;
    let workParts = 0;
    creep.forEach(p => {
      if (p === CARRY) carryParts += 1;
      if (p === MOVE) moveParts += 1;
      if (p === WORK) workParts += 1;
    });
    const energyUsed = (constructionToDo ? BUILD_POWER : REPAIR_COST * REPAIR_POWER) * workParts;
    const workTime = (CARRY_CAPACITY * carryParts) / energyUsed;
    const speed = Math.min(1, (moveParts * 2) / ((rcl(office) >= 3 ? 1 : 2) * (workParts + carryParts / 2)));
    const travelTime = (Math.max(0, range - 3) * 2) / speed;
    const efficiency = workTime / (workTime + travelTime);
    // console.log('range', range, 'energyUsed', energyUsed, 'workTime', workTime, 'travelTime', travelTime, 'efficiency', efficiency);
    return efficiency;
  }
);

export const facilitiesEfficiencyByStructure = (office: string, structure: PlannedStructure) => {
  const storage = roomPlans(office)?.headquarters?.storage.pos;
  const range = storage ? getRangeTo(storage, structure.pos) : 25;
  const energyUsed = structure.structure ? REPAIR_COST * REPAIR_POWER : BUILD_POWER;
  const workTime = CARRY_CAPACITY / energyUsed;
  const travelTime = Math.max(0, range - 3) * 2;
  const efficiency = workTime / (workTime + travelTime);
  return efficiency;
};
