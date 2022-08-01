import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { roomPlans } from './roomPlans';
import { getExtensions } from './spawnsAndExtensionsDemand';
import { isPlannedStructure } from './typeguards';

export const plannedStructuresByRcl = (roomName: string, targetRcl?: number) => {
  if (Memory.offices[roomName]) {
    return plannedOfficeStructuresByRcl(roomName, targetRcl);
  } else {
    return plannedTerritoryStructures(roomName);
  }
};

export const plannedTerritoryStructures = (territoryName: string) => {
  const plans = roomPlans(territoryName);
  return [plans?.franchise1?.container, plans?.franchise2?.container].filter(s => s) as PlannedStructure[];
};

// memoize(
//   (officeName: string, targetRcl?: number) =>
//     `${officeName}_${targetRcl}_${Object.values(Memory.roomPlans[officeName] ?? {}).filter(v => !!v).length}`,

export const plannedOfficeStructuresByRcl = (officeName: string, targetRcl?: number) => {
  const plans = roomPlans(officeName);
  const rcl = targetRcl ?? Game.rooms[officeName]?.controller?.level;
  if (!rcl || !plans) return [];

  let plannedStructures: (PlannedStructure | undefined)[] = [];
  let plannedExtensions = getExtensions(officeName);

  // Sort already constructed structures to the top
  plannedExtensions = plannedExtensions.filter(e => e.structure).concat(plannedExtensions.filter(e => !e.structure));
  let plannedTowers = ([] as PlannedStructure[]).concat(
    plans.backfill?.towers.filter(t => t.structure) ?? [],
    plans.backfill?.towers.filter(t => !t.structure) ?? []
  );

  if (rcl >= 0) {
    plannedStructures = [];
  }
  if (rcl >= 1) {
    plannedStructures = plannedStructures.concat(plans.fastfiller?.spawns[0]);
  }
  if (rcl >= 2) {
    plannedStructures = plannedStructures.concat(
      plannedExtensions.slice(0, 5),
      plans.fastfiller?.containers ?? [],
      plans.library?.container
    );
  }
  if (rcl >= 3) {
    plannedStructures = plannedStructures.concat(
      plannedExtensions.slice(5, 10),
      plannedTowers.slice(0, 1),
      plans.franchise1?.container,
      plans.franchise2?.container
    );
  }
  if (rcl >= 4) {
    plannedStructures = plannedStructures.concat(
      plannedExtensions.slice(10, 20),
      plans.headquarters?.storage,
      plans.franchise1?.ramparts ?? [],
      plans.perimeter?.ramparts ?? [],
      plans.extensions?.ramparts ?? [],
      plans.franchise2?.ramparts ?? []
    );
  }
  if (rcl >= 5) {
    plannedStructures = plannedStructures.concat(
      plannedExtensions.slice(20, 30),
      plannedTowers.slice(1, 2),
      [plans.fastfiller?.link],
      [plans.headquarters?.link]
    );
  }
  if (rcl >= 6) {
    plannedStructures = plannedStructures.concat(
      plannedExtensions.slice(30, 40),
      [plans.library?.link],
      [plans.headquarters?.terminal],
      [plans.mine?.extractor],
      [plans.mine?.container]
    );
  }
  if (rcl >= 7) {
    plannedStructures = plannedStructures.concat(
      plannedExtensions.slice(40, 50),
      plans.fastfiller?.spawns[1],
      plans.franchise2?.link,
      plannedTowers.slice(2, 3),
      plans.labs?.labs.slice(0, 6) ?? [],
      plans.headquarters?.factory
    );
  }
  if (rcl === 8) {
    plannedStructures = plannedStructures.concat(
      plannedExtensions.slice(50, 60),
      plans.fastfiller?.spawns[2],
      plans.franchise1?.link,
      plannedTowers.slice(3, 6),
      plans.labs?.labs.slice(6, 10) ?? [],
      plans.headquarters?.nuker,
      plans.headquarters?.powerSpawn,
      plans.backfill?.observer
    );
  }

  // Roads are always at the end of the priority queue
  if (rcl >= 3) {
    plannedStructures = plannedStructures.concat(
      plans.fastfiller?.roads ?? [],
      plans.headquarters?.roads ?? [],
      plans.extensions?.roads ?? [],
      plans.roads?.roads ?? []
    );
  }
  if (rcl >= 7) {
    plannedStructures = plannedStructures.concat(plans.labs?.roads ?? []);
  }
  // if (rcl >= 4) {
  //     // No ramparts on roads, walls, ramparts, extractors, or extensions
  //     // Perimeter extensions have ramparts already
  //     const nonRampartedStructures: StructureConstant[] = [STRUCTURE_ROAD, STRUCTURE_WALL, STRUCTURE_RAMPART, STRUCTURE_EXTRACTOR, STRUCTURE_EXTENSION]
  //     for (let s of plannedStructures) {
  //         if (!nonRampartedStructures.includes(s.structureType)) {
  //             plannedStructures.push(new PlannedStructure(s.pos, STRUCTURE_RAMPART))
  //         }
  //     }
  // }
  return [...new Set(plannedStructures.filter(isPlannedStructure()))];
};
