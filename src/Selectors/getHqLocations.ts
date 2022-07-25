import { calculateAdjacentPositions } from "./Map/MapCoordinates";
import { roomPlans } from "./roomPlans";

const refillerLocationCache = new Map<string, RoomPosition>();
export const getTowerRefillerLocation = (office: string) => {
    if (refillerLocationCache.has(office)) return refillerLocationCache.get(office);
    const plan = roomPlans(office)?.headquarters
    if (!plan) return;
    const pos = calculateAdjacentPositions(plan.spawn.pos).find(pos => plan.towers.every(t => pos.inRangeTo(t.pos, 1)));
    if (!pos) return;
    refillerLocationCache.set(office, pos);
    return pos;
}

const logisticsLocationCache = new Map<string, RoomPosition>();
export const getHeadquarterLogisticsLocation = (office: string) => {
    if (logisticsLocationCache.has(office)) return logisticsLocationCache.get(office);
    const plan = roomPlans(office)?.headquarters
    if (!plan) return;
    const pos = plan.container.pos;
    if (!pos) return;
    logisticsLocationCache.set(office, pos);
    return pos;
}
