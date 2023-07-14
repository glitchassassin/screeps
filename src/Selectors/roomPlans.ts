import { RoomPlan } from 'RoomPlanner';
import { deserializeBackfillPlan } from 'RoomPlanner/Backfill/deserializeBackfillPlan';
import { deserializeExtensionsPlan } from 'RoomPlanner/Extensions/deserializeExtensionsPlan';
import { deserializeFranchisePlan } from 'RoomPlanner/Franchise/deserializeFranchisePlan';
import { deserializeLibraryPlan } from 'RoomPlanner/Library/deserializeLibraryPlan';
import { deserializeMinePlan } from 'RoomPlanner/Mine/deserializeMinePlan';
import { deserializePerimeterPlan } from 'RoomPlanner/Perimeter/deserializePerimeterPlan';
import { deserializeRoadsPlan } from 'RoomPlanner/Roads/deserializeRoadsPlan';
import { deserializeFastfillerPlan } from 'RoomPlanner/Stamps/deserializeFastfillerPlan';
import { deserializeHeadquartersPlan } from 'RoomPlanner/Stamps/deserializeHeadquartersPlan';
import { deserializeLabsPlan } from 'RoomPlanner/Stamps/deserializeLabsPlan';
import { memoizeByTick } from 'utils/memoizeFunction';
import { posById } from './posById';

const plans: Map<string, RoomPlan> = new Map();

const updateRoomPlan = <T extends keyof RoomPlan>(
  roomName: string,
  plan: T,
  deserializer: (plan: string) => RoomPlan[T]
) => {
  let memoryPlan = Memory.roomPlans[roomName][plan];
  let cachedPlan = plans.get(roomName) ?? {};
  plans.set(roomName, cachedPlan);

  if (typeof memoryPlan === 'string' && !cachedPlan[plan]) {
    try {
      cachedPlan[plan] = deserializer(memoryPlan);
    } catch {
      console.log(`Error deserializing ${plan} plan for ${roomName}, resetting it`);
      delete Memory.roomPlans[roomName][plan];
    }
  }
};

declare global {
  namespace NodeJS {
    interface Global {
      resetRoomPlan: (room?: string) => void;
    }
  }
}

global.resetRoomPlan = (room?: string) => {
  if (room) {
    delete Memory.roomPlans[room];
    plans.delete(room);
  } else {
    Memory.roomPlans = {};
    for (const [p] of plans) {
      plans.delete(p);
    }
  }
};

export const roomPlans = memoizeByTick(
  roomName => roomName,
  (roomName: string) => {
    Memory.roomPlans ??= {};

    let plan = Memory.roomPlans[roomName];
    if (!plan) {
      plans.delete(roomName);
      return;
    }
    let cachedPlan = plans.get(roomName) ?? {};
    plans.set(roomName, cachedPlan);

    // Check if room plan needs to be updated
    updateRoomPlan(roomName, 'franchise1', deserializeFranchisePlan);
    updateRoomPlan(roomName, 'franchise2', deserializeFranchisePlan);
    updateRoomPlan(roomName, 'mine', deserializeMinePlan);
    updateRoomPlan(roomName, 'library', deserializeLibraryPlan);
    updateRoomPlan(roomName, 'headquarters', deserializeHeadquartersPlan);
    updateRoomPlan(roomName, 'labs', deserializeLabsPlan);
    updateRoomPlan(roomName, 'fastfiller', deserializeFastfillerPlan);
    updateRoomPlan(roomName, 'extensions', deserializeExtensionsPlan);
    updateRoomPlan(roomName, 'backfill', deserializeBackfillPlan);
    updateRoomPlan(roomName, 'perimeter', deserializePerimeterPlan);
    updateRoomPlan(roomName, 'roads', deserializeRoadsPlan);

    return cachedPlan;
  }
)

export const getSpawns = memoizeByTick(
  roomName => roomName,
  (roomName: string) => {
    const plan = roomPlans(roomName);
    const fastfillers = plan?.fastfiller?.spawns.map(s => s.structure).filter(s => s && s.isActive());
    if (fastfillers?.length) return fastfillers as StructureSpawn[];
    return (Game.rooms[roomName]?.find(FIND_MY_SPAWNS) ?? []) as StructureSpawn[];
  }
);

export const getFranchisePlanBySourceId = memoizeByTick(
  id => id,
  (id: Id<Source>) => {
    const pos = posById(id);
    if (!pos) return;
    const plan = roomPlans(pos.roomName);
    plan?.franchise1?.container.survey();
    plan?.franchise2?.container.survey();
    if (plan?.franchise1?.sourceId === id) return plan.franchise1;
    if (plan?.franchise2?.sourceId === id) return plan.franchise2;
    return;
  }
);
