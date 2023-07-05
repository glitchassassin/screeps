import { PlannedStructure } from 'RoomPlanner/PlannedStructure';

/**
 * If structure is missing more than this many hitpoints,
 * repair it
 */
export const repairThreshold = (structure: PlannedStructure<BuildableStructureConstant>) => {
  const barrierThresholdTypes = [STRUCTURE_RAMPART, STRUCTURE_CONTAINER, STRUCTURE_WALL] as string[];
  if (structure.structureType === STRUCTURE_ROAD) {
    return (structure.structure?.hitsMax ?? ROAD_HITS) * 0.5;
  } else if (barrierThresholdTypes.includes(structure.structureType)) {
    return CARRY_CAPACITY * REPAIR_POWER * 0.1; // 10% of a carry's worth of repair hits
  } else {
    return 0;
  }
};
