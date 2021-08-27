import { PlannedStructure } from "RoomPlanner/PlannedStructure"

export const isUndefined = (item: any): item is undefined => item === undefined

export const isRoomPosition = (item: any): item is RoomPosition => item instanceof RoomPosition

export const isCreep = (item: any): item is Creep => item instanceof Creep

export const isPlannedStructure = <T extends BuildableStructureConstant = BuildableStructureConstant>(type?: T) =>
    (structure?: PlannedStructure): structure is PlannedStructure<T> =>
    (!!structure && (!type || structure.structureType === type))
