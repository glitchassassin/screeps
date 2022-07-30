import { FastfillerPlan, HeadquartersPlan, LabsPlan, RoomPlan } from 'RoomPlanner';
import { planExtensions } from 'RoomPlanner/Extensions/ExtensionsPlan';
import { planFranchise } from 'RoomPlanner/Franchise/FranchisePlan';
import { planLabs } from 'RoomPlanner/Labs/LabsPlan';
import { planMine } from 'RoomPlanner/Mine/MinePlan';
import { planPerimeter } from 'RoomPlanner/Perimeter/PerimeterPlan';
import { serializePlannedStructures } from 'Selectors/plannedStructures';
import { posById } from 'Selectors/posById';
import { controllerPosition, sourceIds } from 'Selectors/roomCache';
import { serializeFranchisePlan } from './Franchise/serializeFranchisePlan';
import { planRoads } from './Roads/RoadsPlan';
import { planMainStamps } from './Stamps/planMainStamps';

declare global {
  interface Memory {
    roomPlans: {
      [index: string]: {
        complete: boolean;
        office?: boolean;
        headquarters?: string | null;
        franchise1?: string | null;
        franchise2?: string | null;
        mine?: string | null;
        extensions?: string | null;
        perimeter?: string | null;
        labs?: string | null;
        roads?: string | null;
        fastfiller?: string | null;
        towers?: string | null;
      };
    };
  }
}

const roomSectionPlanner =
  <T extends keyof RoomPlan>(
    room: string,
    plan: T,
    planner: (room: string) => RoomPlan[T],
    serializer: (plan: RoomPlan[T]) => string
  ) =>
  () => {
    if (Memory.roomPlans[room][plan] === undefined) {
      try {
        const plannedSection = planner(room);
        Memory.roomPlans[room][plan] = serializer(plannedSection);
      } catch (e) {
        console.log(`Error planning ${plan} for ${room}: ${e}`);
        Memory.roomPlans[room][plan] = null;
      }
    }
  };

const mainStampsPlanner =
  (
    room: string,
    planner: (room: string) => {
      hq: RoomPlan['headquarters'];
      labs: RoomPlan['labs'];
      fastfiller: RoomPlan['fastfiller'];
    },
    serializer: (plan: HeadquartersPlan | LabsPlan | FastfillerPlan) => string
  ) =>
  () => {
    if (
      Memory.roomPlans[room].headquarters === undefined ||
      Memory.roomPlans[room].labs === undefined ||
      Memory.roomPlans[room].fastfiller === undefined
    ) {
      try {
        const { hq, labs, fastfiller } = planner(room);
        if (!hq) throw new Error('No hq plan');
        if (!labs) throw new Error('No labs plan');
        if (!fastfiller) throw new Error('No fastfiller plan');
        Memory.roomPlans[room].headquarters = serializer(hq);
        Memory.roomPlans[room].labs = serializer(labs);
        Memory.roomPlans[room].fastfiller = serializer(fastfiller);
      } catch (e) {
        console.log(`Error planning stamps for ${room}: ${e}`);
        Memory.roomPlans[room].headquarters = null;
        Memory.roomPlans[room].labs = null;
        Memory.roomPlans[room].fastfiller = null;
      }
    }
  };

const serializePlan = <T extends keyof RoomPlan>(plan: RoomPlan[T]) => {
  if (!plan) throw new Error('Undefined plan, cannot serialize');
  return serializePlannedStructures(Object.values(plan ?? {}).flat());
};

export const generateRoomPlans = (roomName: string) => {
  Memory.roomPlans ??= {};
  Memory.roomPlans[roomName] ??= {
    complete: false
  };
  if (Memory.roomPlans[roomName].complete) return;

  const controllerPos = controllerPosition(roomName)!;
  // Make sure that if exactly one Franchise already has a spawn, it becomes franchise1;
  // otherwise, they are sorted in order of distance to controller
  const populatedSources = sourceIds(roomName)
    .filter(s => Game.rooms[roomName] && posById(s)!.findInRange(FIND_MY_SPAWNS, 3).length)
    .sort((a, b) => posById(a)!.getRangeTo(controllerPos) - posById(b)!.getRangeTo(controllerPos));
  const franchiseSources = populatedSources.length
    ? populatedSources.concat(sourceIds(roomName).filter(id => !populatedSources.includes(id)))
    : sourceIds(roomName).sort((a, b) => posById(a)!.getRangeTo(controllerPos) - posById(b)!.getRangeTo(controllerPos));
  const [franchise1, franchise2] = franchiseSources;

  const steps = [
    roomSectionPlanner(roomName, 'franchise1', () => planFranchise(franchise1), serializeFranchisePlan),
    roomSectionPlanner(roomName, 'franchise2', () => planFranchise(franchise2), serializeFranchisePlan),
    roomSectionPlanner(roomName, 'mine', planMine, serializePlan),
    mainStampsPlanner(roomName, planMainStamps, serializePlan),
    roomSectionPlanner(roomName, 'labs', planLabs, serializePlan),
    roomSectionPlanner(roomName, 'extensions', planExtensions, serializePlan),
    roomSectionPlanner(roomName, 'perimeter', planPerimeter, serializePlan),
    roomSectionPlanner(roomName, 'roads', planRoads, serializePlan)
  ];

  const start = Game.cpu.getUsed();
  for (let step of steps) {
    step();
    const used = Game.cpu.getUsed() - start;
    if (used > 10) {
      return; // continue planning next time
    }
  }

  Memory.roomPlans[roomName].complete = true;
  Memory.roomPlans[roomName].office =
    Memory.rooms[roomName].eligibleForOffice &&
    Memory.roomPlans[roomName].headquarters !== null &&
    Memory.roomPlans[roomName].franchise1 !== null &&
    Memory.roomPlans[roomName].franchise2 !== null &&
    Memory.roomPlans[roomName].mine !== null &&
    Memory.roomPlans[roomName].labs !== null &&
    Memory.roomPlans[roomName].extensions !== null &&
    Memory.roomPlans[roomName].perimeter !== null &&
    Memory.roomPlans[roomName].fastfiller !== null &&
    Memory.roomPlans[roomName].roads !== null;
};
