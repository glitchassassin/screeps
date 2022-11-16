import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { calculateDefensiveThreatLevel } from './Combat/threatAnalysis';
import { plannedActiveFranchiseRoads } from './plannedActiveFranchiseRoads';
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

  let energyStructures: (PlannedStructure | undefined)[] = [];
  let defensiveStructures: (PlannedStructure | undefined)[] = [];
  let plannedStructures: (PlannedStructure | undefined)[] = [];
  let plannedExtensions = getExtensions(officeName);

  // Sort already constructed structures to the top
  plannedExtensions = plannedExtensions.filter(e => e.structure).concat(plannedExtensions.filter(e => !e.structure));
  let plannedTowers = ([] as PlannedStructure[]).concat(
    plans.backfill?.towers.filter(t => t.structure) ?? [],
    plans.backfill?.towers.filter(t => !t.structure) ?? []
  );

  // first, build the further of the library link or the fastfiller link
  const libraryIsFurther =
    plans.library &&
    plans.fastfiller &&
    plans.headquarters &&
    plans.library.link.pos.getRangeTo(plans.headquarters.link.pos) >
      plans.fastfiller.link.pos.getRangeTo(plans.headquarters.link.pos);

  if (rcl >= 0) {
    plannedStructures = [];
    energyStructures = [];
    defensiveStructures = [];
  }
  if (rcl >= 1) {
    energyStructures = energyStructures.concat(plans.fastfiller?.spawns[0]);
  }
  if (rcl >= 2) {
    energyStructures = energyStructures.concat(plans.fastfiller?.containers ?? [], plannedExtensions.slice(0, 5));
  }
  if (rcl >= 2 && rcl <= 6) {
    plannedStructures = plannedStructures.concat(plans.library?.container);
  }
  if (rcl >= 3) {
    energyStructures = energyStructures.concat(
      plannedExtensions.slice(5, 10),
      plans.franchise1?.container,
      plans.franchise2?.container
    );
    defensiveStructures = defensiveStructures.concat(plannedTowers.slice(0, 1));
  }
  if (rcl >= 4) {
    energyStructures = energyStructures.concat(plannedExtensions.slice(10, 20), plans.headquarters?.storage);
    const ramparts = [
      plans.franchise1?.ramparts ?? [],
      plans.perimeter?.ramparts ?? [],
      plans.extensions?.ramparts ?? [],
      plans.franchise2?.ramparts ?? []
    ]
      .flat()
      .sort((a, b) => (!a.structure?.hits ? -1 : !b.structure?.hits ? 1 : a.structure.hits - b.structure.hits));
    defensiveStructures = defensiveStructures.concat(ramparts);
  }
  if (rcl >= 5) {
    energyStructures = energyStructures.concat(plannedExtensions.slice(20, 30));
    defensiveStructures = defensiveStructures.concat(plannedTowers.slice(1, 2));
    if (libraryIsFurther) {
      plannedStructures = plannedStructures.concat([plans.library?.link], [plans.headquarters?.link]);
    } else {
      plannedStructures = plannedStructures.concat([plans.fastfiller?.link], [plans.headquarters?.link]);
    }
  }
  if (rcl >= 6) {
    if (libraryIsFurther) {
      energyStructures = energyStructures.concat(plannedExtensions.slice(30, 40), [plans.fastfiller?.link]);
    } else {
      energyStructures = energyStructures.concat(plannedExtensions.slice(30, 40), [plans.library?.link]);
    }
    plannedStructures = plannedStructures.concat(
      [plans.headquarters?.terminal],
      [plans.mine?.extractor],
      [plans.mine?.container]
    );
  }
  if (rcl >= 7) {
    energyStructures = energyStructures.concat(
      plannedExtensions.slice(40, 50),
      plans.fastfiller?.spawns[1],
      plans.franchise2?.link
    );
    defensiveStructures = defensiveStructures.concat(plannedTowers.slice(2, 3));
    plannedStructures = plannedStructures.concat(plans.labs?.labs.slice(0, 6) ?? [], plans.headquarters?.factory);
  }
  if (rcl === 8) {
    energyStructures = energyStructures.concat(
      plannedExtensions.slice(50, 60),
      plans.fastfiller?.spawns[2],
      plans.franchise1?.link
    );
    defensiveStructures = defensiveStructures.concat(plannedTowers.slice(3, 6));
    plannedStructures = plannedStructures.concat(
      plans.labs?.labs.slice(6, 10) ?? [],
      plans.headquarters?.nuker,
      plans.headquarters?.powerSpawn,
      plans.backfill?.observer
    );
  }

  // Roads are at the end of the energy structures priority queue
  if (rcl >= 3) {
    energyStructures = energyStructures.concat(
      plans.fastfiller?.roads ?? [],
      plans.headquarters?.roads ?? [],
      plans.extensions?.roads ?? [],
      plans.roads?.roads ?? [],
      plannedActiveFranchiseRoads(officeName)
    );
  }
  if (rcl >= 7) {
    plannedStructures = plannedStructures.concat(plans.labs?.roads ?? []);
  }

  if (calculateDefensiveThreatLevel(officeName) > 0) {
    // defensive structures have priority
    plannedStructures = [...defensiveStructures, ...energyStructures, ...plannedStructures];
  } else {
    // energy structures have priority
    plannedStructures = [...energyStructures, ...defensiveStructures, ...plannedStructures];
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
