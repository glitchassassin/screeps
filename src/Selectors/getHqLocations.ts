import { roomPlans } from './roomPlans';

const logisticsLocationCache = new Map<string, RoomPosition>();
export const getHeadquarterLogisticsLocation = (office: string) => {
  if (logisticsLocationCache.has(office)) return logisticsLocationCache.get(office);
  const plan = roomPlans(office)?.headquarters?.storage.pos;
  if (!plan) return;
  const pos = new RoomPosition(plan.x + 1, plan.y + 1, plan.roomName);
  if (!pos) return;
  logisticsLocationCache.set(office, pos);
  return pos;
};
