import { RoadsPlan } from 'RoomPlanner';
import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { costMatrixFromRoomPlan } from 'Selectors/costMatrixFromRoomPlan';
import { roomPlans } from 'Selectors/roomPlans';
import { validateRoadsPlan } from './validateRoadsPlan';

export const planRoads = (office: string) => {
  const roads = new Set<PlannedStructure<STRUCTURE_ROAD>>();
  const cm = costMatrixFromRoomPlan(office);
  const plans = roomPlans(office);
  if (!plans) throw new Error('No office structures to route between');

  const storage = plans.headquarters?.storage.pos;
  const franchise1 = plans.franchise1?.container.pos;
  const franchise2 = plans.franchise2?.container.pos;
  const mine = plans.mine?.container.pos;
  const labs = plans.labs?.roads[0].pos;
  const library = plans.library?.container.pos;

  // Road from each Franchise
  if (storage && franchise1) {
    const route = PathFinder.search(
      franchise1,
      { pos: storage, range: 1 },
      {
        roomCallback: room => (room === office ? cm : false),
        maxRooms: 1
      }
    );
    if (route.incomplete) throw new Error('Unable to path between franchise1 and storage');
    for (let pos of route.path) {
      roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
      if (cm.get(pos.x, pos.y) !== 255) cm.set(pos.x, pos.y, 1);
    }
  }
  if (storage && franchise2) {
    const route = PathFinder.search(
      franchise2,
      { pos: storage, range: 1 },
      {
        roomCallback: room => (room === office ? cm : false),
        maxRooms: 1
      }
    );
    if (route.incomplete) throw new Error('Unable to path between franchise2 and storage');
    for (let pos of route.path) {
      roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
      if (cm.get(pos.x, pos.y) !== 255) cm.set(pos.x, pos.y, 1);
    }
  }

  // Road from labs
  if (storage && labs) {
    const route = PathFinder.search(
      labs,
      { pos: storage, range: 1 },
      {
        roomCallback: room => (room === office ? cm : false),
        maxRooms: 1
      }
    );
    if (route.incomplete) throw new Error('Unable to path between labs and storage');
    for (let pos of route.path) {
      roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
      if (cm.get(pos.x, pos.y) !== 255) cm.set(pos.x, pos.y, 1);
    }
  }

  // Road from mine
  if (storage && mine) {
    const route = PathFinder.search(
      mine,
      { pos: storage, range: 1 },
      {
        roomCallback: room => (room === office ? cm : false),
        maxRooms: 1
      }
    );
    if (route.incomplete) throw new Error('Unable to path between mine and storage');
    for (let pos of route.path) {
      roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
      if (cm.get(pos.x, pos.y) !== 255) cm.set(pos.x, pos.y, 1);
    }
  }

  // Road from mine
  if (storage && library) {
    const route = PathFinder.search(
      library,
      { pos: storage, range: 1 },
      {
        roomCallback: room => (room === office ? cm : false),
        maxRooms: 1
      }
    );
    if (route.incomplete) throw new Error('Unable to path between library and storage');
    for (let pos of route.path) {
      roads.add(new PlannedStructure(pos, STRUCTURE_ROAD));
      if (cm.get(pos.x, pos.y) !== 255) cm.set(pos.x, pos.y, 1);
    }
  }

  const plan: Partial<RoadsPlan> = {
    roads: Array.from(roads)
  };
  return validateRoadsPlan(plan);
};
